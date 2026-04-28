import { NextResponse } from 'next/server';
import monitoring from '@google-cloud/monitoring';
import path from 'path';
import { adminAuth, adminDb } from '@/firebase/admin';

// Requerimos autenticación de Firebase Admin
export async function GET(request: Request) {
  try {
    // 1. Verificar autorización (Admin)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Verificar rol en la BD
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Cliente de Monitoring
    const getCredentials = () => {
      const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (envServiceAccount) return { credentials: JSON.parse(envServiceAccount) };
      return { keyFilename: path.join(process.cwd(), 'service-account.json') };
    };

    const client = new monitoring.MetricServiceClient({
      projectId: 'studio-1413684383-379c9',
      ...getCredentials()
    });
    const projectId = 'studio-1413684383-379c9';
    const projectPath = client.projectPath(projectId);

    // Fechas: Últimos 30 días
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const requestOptions = {
      name: projectPath,
      interval: {
        startTime: { seconds: startTime.getTime() / 1000 },
        endTime: { seconds: now.getTime() / 1000 },
      },
      aggregation: {
        alignmentPeriod: { seconds: 86400 }, // 1 día
        perSeriesAligner: 'ALIGN_SUM' as const,
        crossSeriesReducer: 'REDUCE_SUM' as const,
      },
    };

    // Consultas a la API de GCP
    // 1. Firestore Lecturas
    const [readResponse] = await client.listTimeSeries({
      ...requestOptions,
      filter: 'metric.type="firestore.googleapis.com/document/read_count"',
    });

    // 2. Firestore Escrituras
    const [writeResponse] = await client.listTimeSeries({
      ...requestOptions,
      filter: 'metric.type="firestore.googleapis.com/document/write_count"',
    });

    // 3. Storage Bytes (Total)
    const [storageResponse] = await client.listTimeSeries({
      ...requestOptions,
      filter: 'metric.type="storage.googleapis.com/storage/total_bytes"',
      aggregation: {
        alignmentPeriod: { seconds: 86400 },
        perSeriesAligner: 'ALIGN_MEAN' as const,
        crossSeriesReducer: 'REDUCE_MEAN' as const,
      }
    });

    // Parsear series de tiempo a un formato útil para el chart (Recharts)
    const dailyData: Record<string, any> = {};

    // Helper para procesar puntos
    const processPoints = (series: any[], key: string, isStorage = false) => {
      if (!series || series.length === 0) return;
      series[0].points.forEach((point: any) => {
        const date = new Date(point.interval.endTime.seconds * 1000).toISOString().split('T')[0];
        if (!dailyData[date]) dailyData[date] = { date, reads: 0, writes: 0, storageBytes: 0 };
        let value = Number(point.value.int64Value || point.value.doubleValue || 0);
        if (isStorage) value = value / (1024 * 1024 * 1024); // Convertir a GB
        dailyData[date][key] = value;
      });
    };

    processPoints(readResponse, 'reads');
    processPoints(writeResponse, 'writes');
    processPoints(storageResponse, 'storageBytes', true);

    const chartData = Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Obtener consumo AI (ejemplo de la colección que vamos a crear)
    let aiTokens = 0;
    let aiCost = 0;
    try {
      const aiDocs = await adminDb.collection('system_metrics').where('type', '==', 'ai_usage').get();
      aiDocs.forEach(doc => {
        const d = doc.data();
        aiTokens += (d.totalTokens || 0);
        aiCost += (d.cost || 0);
      });
    } catch (e) {
      console.warn("No ai metrics found yet");
    }

    return NextResponse.json({
      success: true,
      data: {
        daily: chartData,
        summary: {
          totalReads: chartData.reduce((acc, d) => acc + (d.reads || 0), 0),
          totalWrites: chartData.reduce((acc, d) => acc + (d.writes || 0), 0),
          currentStorageGB: chartData.length > 0 ? chartData[chartData.length - 1].storageBytes : 0,
          aiTokens,
          aiCost,
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
