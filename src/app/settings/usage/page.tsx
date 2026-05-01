'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Activity, Database, Server, Zap, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuth } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function UsageMetricsPage() {
  const { t } = useI18n();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      if (!user || user.role !== 'admin') return;
      
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("No autenticado");

        const res = await fetch('/api/admin/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Error al obtener métricas');
        }

        const data = await res.json();
        setMetrics(data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (!userLoading) {
      fetchMetrics();
    }
  }, [user, userLoading]);

  const handleClearChatHistory = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar todo el historial de chat del asistente? Esta acción es irreversible.')) return;
    
    setIsClearingChat(true);
    try {
      const chatRef = collection(firestore, 'chat_history');
      const snap = await getDocs(chatRef);
      const batch = writeBatch(firestore);
      
      snap.forEach((d) => {
        batch.delete(d.ref);
      });

      await batch.commit();
      toast({ variant: 'success', title: 'Historial borrado', description: 'Se ha vaciado la colección de chat_history.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al borrar', description: e.message });
    } finally {
      setIsClearingChat(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-[200px] w-full mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No se pudieron cargar los consumos: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const chartData = metrics?.daily || [];
  const summary = metrics?.summary || {};

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Métricas y Consumos">
        <div className="flex bg-muted rounded-lg p-1 mr-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/users">{t('Settings.users')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/system">{t('Settings.system')}</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/settings/usage">Consumos y Costos</Link>
          </Button>
        </div>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 pb-24 space-y-6 animate-in fade-in duration-300">
        
        {/* Herramientas de Mantenimiento */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Mantenimiento del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive border-destructive hover:bg-destructive/5"
              onClick={handleClearChatHistory}
              disabled={isClearingChat}
            >
              {isClearingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Vaciar Historial de Chats (Asistente)
            </Button>
          </CardContent>
        </Card>

        {/* KPIs Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-primary">Costo Total Estimado</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${(summary.totalEstimatedCost || 0).toFixed(2)}</div>
              <p className="text-xs text-primary/80">Incluye IA, Firestore y Storage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lecturas Firestore (30d)</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.totalReads || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Est. ${(summary.firestoreReadCost || 0).toFixed(4)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escrituras Firestore (30d)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.totalWrites || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Est. ${(summary.firestoreWriteCost || 0).toFixed(4)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Almacenamiento (Storage)</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.currentStorageGB || 0).toFixed(2)} GB</div>
              <p className="text-xs text-muted-foreground">Est. ${(summary.storageCost || 0).toFixed(4)}/mes</p>
            </CardContent>
          </Card>
        </div>

        {/* Desglose de Costos IA */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600" />
              Consumo Detallado de IA (Gemini)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Tokens Totales</p>
                <p className="text-xl font-bold">{(summary.aiTokens || 0).toLocaleString()}</p>
              </div>
              <Separator orientation="vertical" className="hidden md:block h-10" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Costo Acumulado IA</p>
                <p className="text-xl font-bold text-amber-700">${(summary.aiCost || 0).toFixed(4)}</p>
              </div>
              <div className="flex-1" />
              <div className="bg-white/50 p-3 rounded-lg border border-amber-100 flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-[10px] text-amber-800 leading-tight">
                  Los costos de IA se calculan en tiempo real basándose en los tokens procesados.<br/>
                  Firestore y Storage son estimaciones basadas en precios de lista.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Tráfico de Firestore (Últimos 30 Días)</CardTitle>
              <CardDescription>Operaciones diarias de lectura y escritura en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" name="Lecturas" dataKey="reads" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" name="Escrituras" dataKey="writes" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crecimiento de Storage (GB)</CardTitle>
              <CardDescription>Evolución del espacio ocupado en la nube.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="storageBytes" name="Almacenamiento (GB)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}