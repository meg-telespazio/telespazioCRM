const monitoring = require('@google-cloud/monitoring');
const path = require('path');

async function testMonitoring() {
  const projectId = 'studio-1413684383-379c9';
  const keyFilename = path.join(process.cwd(), 'service-account.json');

  console.log('--- Iniciando prueba de conectividad ---');
  console.log(`Proyecto: ${projectId}`);
  console.log(`Key: ${keyFilename}`);

  try {
    const client = new monitoring.MetricServiceClient({
      projectId,
      keyFilename,
    });

    const projectPath = client.projectPath(projectId);
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Últimas 24hs

    const request = {
      name: projectPath,
      filter: 'metric.type="firestore.googleapis.com/document/read_count"',
      interval: {
        startTime: { seconds: startTime.getTime() / 1000 },
        endTime: { seconds: now.getTime() / 1000 },
      },
    };

    console.log('Consultando métricas de Firestore...');
    const [timeSeries] = await client.listTimeSeries(request);
    
    console.log('✅ ÉXITO: Conexión establecida.');
    console.log(`Resultados obtenidos: ${timeSeries.length} series de tiempo.`);
    
    if (timeSeries.length > 0) {
      console.log('Métrica detectada:', timeSeries[0].metric.type);
    } else {
      console.log('Nota: No hay datos de lectura en las últimas 24hs, pero la API respondió correctamente.');
    }

  } catch (error) {
    console.error('❌ ERROR de configuración:');
    if (error.code === 7) {
      console.error('Permiso denegado. Asegúrate de que la Service Account tenga el rol "Monitoring Viewer".');
    } else if (error.code === 3) {
      console.error('API no habilitada. Habilita la "Cloud Monitoring API" en Google Cloud Console.');
    } else {
      console.error(error.message || error);
    }
  }
}

testMonitoring();
