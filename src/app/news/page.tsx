'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CloudSun, 
  TrendingUp, 
  Globe, 
  Newspaper, 
  ExternalLink, 
  X, 
  Zap, 
  DollarSign, 
  BarChart3, 
  RefreshCw,
  MapPin,
  Loader2,
  Droplets,
  ShoppingBag,
  Landmark,
  Pickaxe,
  RadioTower,
  Rocket,
  AlertTriangle
} from 'lucide-react';
import { fetchProfessionalNews, type NewsOutput } from '@/ai/flows/news-flow';
import type { SystemConfig } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mapeo de iconos por categoría
const categoryIcons: Record<string, any> = {
  'Oil & Gas': Droplets,
  'Retail': ShoppingBag,
  'Finanzas': Landmark,
  'Minería': Pickaxe,
  'Energía': Zap,
  'Telecomunicaciones': RadioTower,
  'Product': Rocket,
  'Default': Newspaper
};

export default function NewsPage() {
  const { t } = useI18n();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [weather, setWeather] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [news, setNews] = useState<NewsOutput | null>(null);
  const [dismissedNews, setDismissedNews] = useState<Set<string>>(new Set());
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Sync Finance Data from our DolarAPI integration
  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: systemConfig } = useDoc<SystemConfig>(configDocRef);

  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    setLoadingWeather(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await res.json();
      setWeather(data.current_weather);
      setLocationStatus('granted');
    } catch (e) {
      console.error("Weather fetch failed");
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error', description: 'Geolocalización no soportada por el navegador.' });
      return;
    }

    setLoadingWeather(true);
    // Explicit call to trigger the browser permission prompt
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Location access denied", err);
        setLocationStatus('denied');
        setLoadingWeather(false);
        toast({ 
          variant: 'destructive',
          title: 'Ubicación Bloqueada', 
          description: 'Habilita el acceso en la configuración de Chrome para ver el clima local.' 
        });
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    // Initial check for permissions
    if (typeof window !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(res => {
        setLocationStatus(res.state as any);
        if (res.state === 'granted') {
          navigator.geolocation.getCurrentPosition(p => fetchWeatherData(p.coords.latitude, p.coords.longitude));
        }
      });
    }

    const loadNews = async () => {
      setLoadingNews(true);
      try {
        const data = await fetchProfessionalNews();
        setNews(data);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al cargar noticias' });
      } finally {
        setLoadingNews(false);
      }
    };
    loadNews();

    // Mock Economic Indices
    setFinanceData({
      riesgoPais: 1240,
      indices: [
        { name: 'S&P 500', value: '5,120.30', change: '+0.45%', up: true },
        { name: 'BOVESPA', value: '128,450', change: '-0.12%', up: false },
        { name: 'MERVAL', value: '1,210,400', change: '+1.20%', up: true },
      ]
    });
  }, [toast, fetchWeatherData]);

  const usdRate = useMemo(() => {
    return systemConfig?.exchangeRates?.find(r => r.from === 'Oficial')?.rate || 
           systemConfig?.exchangeRates?.find(r => r.from === 'ARS')?.rate || 1;
  }, [systemConfig]);

  const handleDismiss = (id: string) => {
    setDismissedNews(prev => new Set([...prev, id]));
  };

  const sectors = useMemo(() => {
    if (!news) return [];
    const cats = news.sectorNews.map(n => n.category);
    return Array.from(new Set(cats)).sort();
  }, [news]);

  const filteredSectorNews = useMemo(() => {
    if (!news) return [];
    return news.sectorNews.filter(n => {
      const isNotDismissed = !dismissedNews.has(n.id);
      const isSelectedSector = selectedSector === 'all' || n.category === selectedSector;
      return isNotDismissed && isSelectedSector;
    });
  }, [news, dismissedNews, selectedSector]);

  const filteredProductNews = useMemo(() => {
    if (!news) return [];
    return news.productNews.filter(n => !dismissedNews.has(n.id));
  }, [news, dismissedNews]);

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  return (
    <div className="flex flex-1 flex-col bg-slate-50/50">
      <AppHeader title={
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">News & Market Insights</h2>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Inteligencia comercial estratégica</p>
          </div>
        </div>
      }>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-8 overflow-y-auto pb-24">
        
        {/* Top Strip: Weather and Economy */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* Weather Card */}
          <Card className="bg-white border-none shadow-sm h-full">
            <CardContent className="p-4 flex items-center justify-between h-full">
              {loadingWeather ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Localizando...</span>
                </div>
              ) : weather ? (
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                    <CloudSun className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Clima Actual</p>
                    <p className="text-2xl font-black text-slate-800">{weather.temperature}°C</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <MapPin className="h-3 w-3" /> Detectado
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Clima Local</p>
                  <Button variant="outline" size="sm" onClick={handleRequestLocation} className="h-8 text-[10px] uppercase font-bold border-primary/20 text-primary">
                    <MapPin className="h-3 w-3 mr-2" /> Habilitar Ubicación
                  </Button>
                  {locationStatus === 'denied' && (
                    <p className="text-[9px] text-red-500 font-bold leading-tight">Acceso bloqueado en Chrome.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dolar Card */}
          <Card className="bg-white border-none shadow-sm h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-full text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Dólar Oficial (ARS)</p>
                <p className="text-2xl font-black text-slate-800">${(1/usdRate).toFixed(2)}</p>
                <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700 border-green-200">SINCRONIZADO</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Riesgo Pais Card */}
          <Card className="bg-white border-none shadow-sm h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-full text-red-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Riesgo País Argentina</p>
                <p className="text-2xl font-black text-slate-800">{financeData?.riesgoPais || '---'}</p>
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-bold">
                  <TrendingUp className="h-3 w-3" /> +12 bps
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indices Strip */}
          <Card className="bg-slate-900 border-none shadow-sm h-full col-span-1 md:col-span-3 lg:col-span-1">
            <CardContent className="p-4 flex flex-col justify-center h-full gap-2">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Índices Bursátiles</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {financeData?.indices.map((idx: any) => (
                  <div key={idx.name} className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-500">{idx.name}</p>
                    <p className="text-xs font-bold text-white">{idx.value}</p>
                    <span className={cn("text-[9px] font-bold", idx.up ? "text-green-400" : "text-red-400")}>
                      {idx.change}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEWS SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed: Sector News with Tabs Filter */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Inteligencia de Sectores</h3>
              </div>
              
              <Tabs value={selectedSector} onValueChange={setSelectedSector} className="w-full sm:w-auto">
                <TabsList className="bg-slate-100/80 p-1 h-9 overflow-x-auto scrollbar-hide">
                  <TabsTrigger value="all" className="text-[10px] font-bold uppercase h-7 px-3">Todos</TabsTrigger>
                  {sectors.map(s => (
                    <TabsTrigger key={s} value={s} className="text-[10px] font-bold uppercase h-7 px-3">{s}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {loadingNews ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSectorNews.map((item) => {
                  const Icon = categoryIcons[item.category] || categoryIcons.Default;
                  return (
                    <Card key={item.id} className="group overflow-hidden border-none shadow-md hover:shadow-lg transition-all relative bg-white">
                      <CardHeader className="p-5 pb-2">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <div className="p-2 bg-primary/10 rounded text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-primary tracking-widest">{item.category}</span>
                           </div>
                           <button 
                            onClick={() => handleDismiss(item.id)}
                            className="p-1.5 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-full transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors">
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4 italic">
                          "{item.summary}"
                        </p>
                        <div className="flex items-center justify-between border-t pt-3">
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 border-slate-200 text-slate-500 bg-slate-50">{item.country}</Badge>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Fuente: {item.source}</span>
                           </div>
                           <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase gap-1.5 text-primary" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {!loadingNews && filteredSectorNews.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed">
                <Newspaper className="h-12 w-12 mx-auto text-slate-100 mb-4" />
                <p className="text-sm text-muted-foreground italic">No hay noticias pendientes en esta categoría.</p>
              </div>
            )}
          </div>

          {/* Sidebar: Starlink Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Ecosistema Starlink</h3>
              </div>
            </div>

            <div className="space-y-4">
              {loadingNews ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredProductNews.map((item) => (
                <Card key={item.id} className="group border-none shadow-sm hover:bg-primary/5 transition-colors relative overflow-hidden bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                       <div className="flex gap-1.5">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                          Enterprise
                        </Badge>
                        <Badge variant="outline" className="text-[8px] uppercase font-bold border-slate-200 text-slate-500">{item.country}</Badge>
                       </div>
                       <button 
                        onClick={() => handleDismiss(item.id)}
                        className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold leading-tight group-hover:text-primary transition-colors">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                      </h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between pt-1 opacity-60">
                         <span className="text-[9px] font-bold text-slate-400">Fuente: {item.source}</span>
                         <ExternalLink className="h-2.5 w-2.5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredProductNews.length === 0 && !loadingNews && (
                <div className="text-center py-12 text-muted-foreground italic text-xs">
                  No hay noticias de producto disponibles.
                </div>
              )}
            </div>

            {/* Newsletter Promo */}
            <Card className="bg-primary text-white border-none shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Rocket className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-tighter text-lg leading-tight">Intel de Campo</h4>
                  <p className="text-[10px] text-white/80 leading-relaxed uppercase font-bold">Boletín semanal de Telespazio</p>
                </div>
                <p className="text-xs leading-relaxed opacity-90">Recibe las últimas novedades del sector directamente en tu bandeja corporativa.</p>
                <Button className="w-full bg-white text-primary hover:bg-slate-100 font-bold h-10">Suscribirme</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
