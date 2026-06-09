'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  TrendingDown, 
  BarChart3, 
  RefreshCw,
  MapPin,
  Loader2
} from 'lucide-react';
import { fetchProfessionalNews, type NewsOutput } from '@/ai/flows/news-flow';
import type { SystemConfig, NewsItem } from '@/lib/types';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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
  const [loadingWeather, setLoadingWeather] = useState(true);

  // Sync Finance Data from our DolarAPI integration
  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: systemConfig } = useDoc<SystemConfig>(configDocRef);

  useEffect(() => {
    // 1. Fetch Weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`);
          const data = await res.json();
          setWeather(data.current_weather);
        } catch (e) {
          console.error("Weather fetch failed");
        } finally {
          setLoadingWeather(false);
        }
      }, () => setLoadingWeather(false));
    } else {
      setLoadingWeather(false);
    }

    // 2. Fetch Professional News via Genkit
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

    // 3. Mock Economic Indices (S&P, BOVESPA, MERVAL, Riesgo Pais)
    setFinanceData({
      riesgoPais: 1240,
      indices: [
        { name: 'S&P 500', value: '5,120.30', change: '+0.45%', up: true },
        { name: 'BOVESPA', value: '128,450', change: '-0.12%', up: false },
        { name: 'MERVAL', value: '1,210,400', change: '+1.20%', up: true },
      ]
    });
  }, [toast]);

  const usdRate = useMemo(() => {
    return systemConfig?.exchangeRates?.find(r => r.from === 'Oficial')?.rate || 
           systemConfig?.exchangeRates?.find(r => r.from === 'ARS')?.rate || 1;
  }, [systemConfig]);

  const handleDismiss = (id: string) => {
    setDismissedNews(prev => new Set([...prev, id]));
  };

  const filteredSectorNews = useMemo(() => {
    if (!news) return [];
    return news.sectorNews.filter(n => !dismissedNews.has(n.id));
  }, [news, dismissedNews]);

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
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Información estratégica para la toma de decisiones</p>
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
              {loadingWeather ? <Skeleton className="h-10 w-full" /> : weather ? (
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                    <CloudSun className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Clima Actual</p>
                    <p className="text-2xl font-black text-slate-800">{weather.temperature}°C</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <MapPin className="h-3 w-3" /> Mi ubicación
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Permite la ubicación para ver el clima.</p>
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
                <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700 border-green-200">ACTUALIZADO</Badge>
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
          
          {/* Main Feed: Sector News */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Sectores de Mercado</h3>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">Latam Insights</Badge>
            </div>

            {loadingNews ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSectorNews.map((item) => (
                  <Card key={item.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="relative h-44 w-full overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        data-ai-hint="business office"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-white font-bold border-none uppercase text-[9px]">
                        {item.category}
                      </Badge>
                      <button 
                        onClick={() => handleDismiss(item.id)}
                        className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors cursor-pointer">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="link" className="p-0 h-auto text-[10px] font-bold uppercase gap-1.5" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          Leer artículo <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Product & Tech News (Starlink/SpaceX focus) */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Ecosistema Starlink</h3>
              </div>
            </div>

            <div className="space-y-4">
              {loadingNews ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredProductNews.map((item) => (
                <Card key={item.id} className="group border-none shadow-sm hover:bg-primary/5 transition-colors relative overflow-hidden">
                  <button 
                    onClick={() => handleDismiss(item.id)}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <CardContent className="p-4 flex gap-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border">
                      <img 
                        src={item.imageUrl} 
                        alt="Product" 
                        className="h-full w-full object-cover" 
                        data-ai-hint="satellite technology"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-bold leading-tight line-clamp-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{item.title}</a>
                      </h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                        {item.summary}
                      </p>
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
                  <Newspaper className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-tighter text-lg">Sales Intel</h4>
                  <p className="text-xs text-white/80 leading-relaxed">Suscríbete a nuestro boletín semanal de inteligencia de mercado de Telespazio.</p>
                </div>
                <Button className="w-full bg-white text-primary hover:bg-slate-100 font-bold">Suscribirme</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}