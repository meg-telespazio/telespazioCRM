
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { getSystemConfig, updateSystemConfig, syncExchangeRates } from '@/lib/firestore/system';
import type { SystemConfig, ExchangeRate, SubsectorConfig } from '@/lib/types';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Save, 
  Database, 
  Globe, 
  Settings2, 
  TrendingUp,
  Loader2,
  Building,
  Layers,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import Link from 'next/link';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

export default function SystemSettingsPage() {
  const { t, locale } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const dateLocale = locale === 'es' ? es : enUS;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    managementAreas: [],
    sectors: [],
    subsectors: [],
    currencies: [],
    unitsOfMeasure: [],
    exchangeRates: []
  });

  const [newInputs, setNewInputs] = useState<Record<string, string>>({
    managementAreas: '',
    currencies: '',
    sectors: '',
    unitsOfMeasure: '',
  });

  const [newSubsector, setNewSubsector] = useState<SubsectorConfig>({ name: '', sector: '' });

  useEffect(() => {
    const loadConfig = async () => {
      const data = await getSystemConfig(firestore);
      if (data) {
        setConfig({
          ...data,
          sectors: data.sectors || [],
          subsectors: data.subsectors || [],
          managementAreas: data.managementAreas || [],
          currencies: data.currencies || [],
          unitsOfMeasure: data.unitsOfMeasure || [],
          exchangeRates: data.exchangeRates || []
        });

        // Automation logic: Check if update is needed (once a day)
        if (user && data.lastRatesUpdate) {
          const hoursSinceUpdate = (new Date().getTime() - data.lastRatesUpdate.getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate > 24) {
            console.log("Automatic rate update triggered...");
            handleSyncRates();
          }
        } else if (user && !data.lastRatesUpdate) {
          handleSyncRates();
        }
      }
      setLoading(false);
    };
    
    loadConfig();
  }, [firestore, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanedExchangeRates = config.exchangeRates.map(r => ({
        ...r,
        rate: isNaN(r.rate) ? 0 : r.rate
      }));

      await updateSystemConfig(firestore, user.uid, {
        ...config,
        exchangeRates: cleanedExchangeRates
      });
      toast({ variant: 'success', title: t('Settings.configSuccess') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRates = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const updatedRates = await syncExchangeRates(firestore, user.uid);
      setConfig(prev => ({ 
        ...prev, 
        exchangeRates: updatedRates,
        lastRatesUpdate: new Date()
      }));
      toast({ variant: 'success', title: 'Cotizaciones actualizadas y registradas en el histórico.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al sincronizar cotizaciones', description: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const addItem = (key: keyof Omit<SystemConfig, 'subsectors' | 'exchangeRates' | 'updatedAt' | 'updatedBy' | 'lastRatesUpdate'>) => {
    const val = newInputs[key];
    if (!val) return;
    setConfig(prev => ({ ...prev, [key]: [...(prev[key] as string[]), val] }));
    setNewInputs(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (key: keyof Omit<SystemConfig, 'subsectors' | 'exchangeRates' | 'updatedAt' | 'updatedBy' | 'lastRatesUpdate'>, index: number) => {
    setConfig(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, i) => i !== index) }));
  };

  const addSubsector = () => {
    if (!newSubsector.name || !newSubsector.sector) return;
    setConfig(prev => ({ ...prev, subsectors: [...prev.subsectors, { ...newSubsector }] }));
    setNewSubsector({ name: '', sector: '' });
  };

  const removeSubsector = (index: number) => {
    setConfig(prev => ({ ...prev, subsectors: prev.subsectors.filter((_, i) => i !== index) }));
  };

  const addRate = () => {
    setConfig(prev => ({ ...prev, exchangeRates: [...prev.exchangeRates, { from: 'ARS', to: 'USD', rate: 1 }] }));
  };

  const updateRate = (index: number, field: keyof ExchangeRate, value: any) => {
    const newRates = [...config.exchangeRates];
    if (field === 'rate') {
      newRates[index].rate = value === '' ? NaN : parseFloat(value);
    } else {
      (newRates[index] as any)[field] = value;
    }
    setConfig(prev => ({ ...prev, exchangeRates: newRates }));
  };

  const removeRate = (index: number) => {
    setConfig(prev => ({ ...prev, exchangeRates: prev.exchangeRates.filter((_, i) => i !== index) }));
  };

  if (loading) return <div className="p-6"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mt-20" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Settings.system')}>
        <div className="flex bg-muted rounded-lg p-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/users">{t('Settings.users')}</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/settings/system">{t('Settings.system')}</Link>
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving} className="ml-4">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('Settings.saveConfig')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" />{t('Settings.managementAreas')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {config.managementAreas.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('managementAreas', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder={t('Settings.addVariable')} value={newInputs.managementAreas} onChange={(e) => setNewInputs(p => ({ ...p, managementAreas: e.target.value }))} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => addItem('managementAreas')}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />{t('Settings.currencies')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {config.currencies.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('currencies', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder={t('Settings.addVariable')} value={newInputs.currencies} onChange={(e) => setNewInputs(p => ({ ...p, currencies: e.target.value }))} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => addItem('currencies')}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Building className="h-4 w-4" />{t('Settings.sectors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {config.sectors.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('sectors', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder={t('Settings.addVariable')} value={newInputs.sectors} onChange={(e) => setNewInputs(p => ({ ...p, sectors: e.target.value }))} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => addItem('sectors')}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" />{t('Settings.units')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {config.unitsOfMeasure.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('unitsOfMeasure', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder={t('Settings.addVariable')} value={newInputs.unitsOfMeasure} onChange={(e) => setNewInputs(p => ({ ...p, unitsOfMeasure: e.target.value }))} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => addItem('unitsOfMeasure')}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />{t('Settings.subsectors')}</CardTitle>
            <CardDescription>Vincule subsectores específicos a un sector padre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label className="text-xs">{t('Settings.parentSector')}</Label>
                <Select value={newSubsector.sector} onValueChange={(v) => setNewSubsector(p => ({ ...p, sector: v }))}>
                  <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Sector..." /></SelectTrigger>
                  <SelectContent>{config.sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('Settings.subsectorName')}</Label>
                <Input value={newSubsector.name} onChange={(e) => setNewSubsector(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Metalúrgica" className="h-8 bg-white text-xs" />
              </div>
              <Button size="sm" className="h-8" onClick={addSubsector} disabled={!newSubsector.name || !newSubsector.sector}><Plus className="h-4 w-4 mr-2" />{t('Settings.addSubsector')}</Button>
            </div>
            <div className="border rounded-md divide-y overflow-hidden bg-white">
              {config.sectors.map(sector => {
                const sectorSubsectors = config.subsectors.filter(s => s.sector === sector);
                return (
                  <div key={sector} className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-primary">{sector}</span>
                      <Badge variant="outline" className="text-[10px]">{sectorSubsectors.length} ítems</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sectorSubsectors.map((sub, i) => {
                        const originalIndex = config.subsectors.findIndex(s => s.name === sub.name && s.sector === sub.sector);
                        return (
                          <Badge key={i} variant="outline" className="pl-3 pr-1 py-1 gap-2 bg-slate-50">
                            {sub.name}
                            <button onClick={() => removeSubsector(originalIndex)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{t('Settings.exchangeRates')}</CardTitle>
              <CardDescription>Cotizaciones automáticas respecto al Dólar (USD).</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {config.lastRatesUpdate && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  <span>Última vez: {format(config.lastRatesUpdate, 'PPp', { locale: dateLocale })}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleSyncRates} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Actualizar Cotizaciones
              </Button>
              <Button variant="outline" size="sm" onClick={addRate}><Plus className="h-4 w-4 mr-2" />Manual</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {config.exchangeRates.map((rate, i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase font-bold w-12">Moneda</Label>
                      <Input value={rate.from} onChange={(e) => updateRate(i, 'from', e.target.value)} className="h-8 bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase font-bold">Valor en USD</Label>
                      <div className="relative flex-1">
                        <Input 
                          type="number" 
                          step="0.001" 
                          value={isNaN(rate.rate) ? '' : rate.rate.toFixed(3)} 
                          onChange={(e) => updateRate(i, 'rate', e.target.value)} 
                          className="h-8 bg-white text-right font-mono pr-8" 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">USD</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-muted-foreground min-w-[120px]">
                    1 USD = {rate.rate > 0 ? (1 / rate.rate).toFixed(3) : '0'} {rate.from}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRate(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {config.exchangeRates.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground italic">No hay tipos de cambio configurados.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
