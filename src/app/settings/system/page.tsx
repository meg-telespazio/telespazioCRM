'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { getSystemConfig, updateSystemConfig } from '@/lib/firestore/system';
import type { SystemConfig, ExchangeRate } from '@/lib/types';
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
  Building
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function SystemSettingsPage() {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    managementAreas: ['Satellite Communications', 'GeoInformacion'],
    industries: ['Agriculture', 'Mining', 'Energy', 'Construction', 'Technology', 'Other'],
    currencies: ['USD', 'EUR', 'ARS'],
    unitsOfMeasure: ['units', 'meters', 'kg', 'liters', 'GB'],
    exchangeRates: [
      { from: 'USD', to: 'ARS', rate: 1000 },
      { from: 'EUR', to: 'USD', rate: 1.08 }
    ]
  });

  useEffect(() => {
    getSystemConfig(firestore).then(data => {
      if (data) setConfig(data);
      setLoading(false);
    });
  }, [firestore]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateSystemConfig(firestore, user.uid, config);
      toast({ variant: 'success', title: t('Settings.configSuccess') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (key: keyof Omit<SystemConfig, 'exchangeRates' | 'updatedAt' | 'updatedBy'>) => {
    const val = prompt(t('Settings.addVariable'));
    if (val) {
      setConfig(prev => ({
        ...prev,
        [key]: [...(prev[key] as string[]), val]
      }));
    }
  };

  const removeItem = (key: keyof Omit<SystemConfig, 'exchangeRates' | 'updatedAt' | 'updatedBy'>, index: number) => {
    setConfig(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).filter((_, i) => i !== index)
    }));
  };

  const addRate = () => {
    setConfig(prev => ({
      ...prev,
      exchangeRates: [...prev.exchangeRates, { from: 'USD', to: 'ARS', rate: 1 }]
    }));
  };

  const updateRate = (index: number, field: keyof ExchangeRate, value: any) => {
    const newRates = [...config.exchangeRates];
    (newRates[index] as any)[field] = field === 'rate' ? parseFloat(value) : value;
    setConfig(prev => ({ ...prev, exchangeRates: newRates }));
  };

  const removeRate = (index: number) => {
    setConfig(prev => ({
      ...prev,
      exchangeRates: prev.exchangeRates.filter((_, i) => i !== index)
    }));
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

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Listas Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" />{t('Settings.managementAreas')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.managementAreas.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('managementAreas', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-7 rounded-full px-3" onClick={() => addItem('managementAreas')}><Plus className="h-3 w-3 mr-1" />{t('Actions.title')}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />{t('Settings.currencies')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.currencies.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('currencies', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-7 rounded-full px-3" onClick={() => addItem('currencies')}><Plus className="h-3 w-3 mr-1" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" />{t('Settings.units')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.unitsOfMeasure.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('unitsOfMeasure', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-7 rounded-full px-3" onClick={() => addItem('unitsOfMeasure')}><Plus className="h-3 w-3 mr-1" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Building className="h-4 w-4" />{t('Settings.industries')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.industries.map((item, i) => (
                  <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 gap-2">
                    {item}
                    <button onClick={() => removeItem('industries', i)} className="hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-7 rounded-full px-3" onClick={() => addItem('industries')}><Plus className="h-3 w-3 mr-1" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tipos de Cambio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{t('Settings.exchangeRates')}</CardTitle>
              <CardDescription>Defina los valores de conversión para los cálculos de MRR y FCV.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addRate}><Plus className="h-4 w-4 mr-2" />{t('Actions.title')}</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {config.exchangeRates.map((rate, i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase font-bold w-12">Desde</Label>
                      <Input value={rate.from} onChange={(e) => updateRate(i, 'from', e.target.value)} className="h-8 bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase font-bold w-12">Hacia</Label>
                      <Input value={rate.to} onChange={(e) => updateRate(i, 'to', e.target.value)} className="h-8 bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-32">
                    <Label className="text-[10px] uppercase font-bold">Valor</Label>
                    <Input type="number" step="0.0001" value={rate.rate} onChange={(e) => updateRate(i, 'rate', e.target.value)} className="h-8 bg-white text-right font-mono" />
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
