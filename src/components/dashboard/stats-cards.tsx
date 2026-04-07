
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Target, Zap, DollarSign, TrendingUp, Briefcase, Contact as ContactIcon } from 'lucide-react';
import type { Opportunity, Client, Contact, ExchangeRate, Service, Equipment } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

type StatsCardsProps = {
    opportunities: Opportunity[];
    clients: Client[];
    contacts: Contact[];
    services: Service[];
    equipment: Equipment[];
    exchangeRates: ExchangeRate[];
    displayCurrency: string;
}

export function StatsCards({ 
  opportunities, 
  clients, 
  contacts, 
  services,
  equipment,
  exchangeRates, 
  displayCurrency 
}: StatsCardsProps) {
  const { t } = useI18n();
  
  const getRateToUsd = (ccy: string) => {
    if (ccy === 'USD') return 1;
    return exchangeRates.find(r => r.from === ccy)?.rate || 1;
  };

  const convertValue = (val: number, fromCcy: string, toCcy: string) => {
    if (fromCcy === toCcy) return val;
    const rateFrom = getRateToUsd(fromCcy);
    const rateTo = getRateToUsd(toCcy);
    return (val * rateFrom) / rateTo;
  };

  // KPI 1: Revenue Ganado
  const totalRevenueConverted = opportunities
    .filter((opp) => opp.stage === 'Won')
    .reduce((sum, opp) => sum + convertValue(opp.value, opp.currency || 'USD', displayCurrency), 0);

  // KPI 2: Close Rate
  const totalWon = opportunities.filter(opp => opp.stage === 'Won').length;
  const totalOpportunities = opportunities.length;
  const closeRate = totalOpportunities > 0 ? (totalWon / totalOpportunities) * 100 : 0;

  // KPI 3: Servicios Activos
  const activeServicesCount = services.filter(s => s.status === 'active').length;

  // KPI 4: Abono Mensual Total (MRR + Comodato)
  const totalMonthlyMRR = useMemo(() => {
    return services
      .filter(s => s.status === 'active')
      .reduce((acc, s) => {
        // Abono del servicio
        let mrrValue = convertValue(s.monthlyFee || 0, s.currency || 'USD', displayCurrency);
        
        // Cargo por comodato si el equipo no es del cliente
        const equip = equipment.find(e => e.id === s.equipmentId);
        if (equip && !equip.isClientOwned) {
          mrrValue += convertValue(equip.comodatoFee || 0, 'USD', displayCurrency);
        }
        
        return acc + mrrValue;
      }, 0);
  }, [services, equipment, displayCurrency, exchangeRates]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-tight text-muted-foreground">{t('Dashboard.stats.totalRevenue')}</CardTitle>
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {displayCurrency} {totalRevenueConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
            {t('Dashboard.stats.totalRevenueDesc')}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-tight text-muted-foreground">{t('Dashboard.stats.closeRate')}</CardTitle>
          <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
            <Target className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {closeRate.toFixed(1)}%
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
            {t('Dashboard.stats.closeRateDesc')}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-tight text-muted-foreground">{t('Dashboard.stats.activeServices')}</CardTitle>
          <div className="h-8 w-8 rounded bg-amber-50 flex items-center justify-center text-amber-600">
            <Zap className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeServicesCount}</div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
            {t('Dashboard.stats.activeServicesDesc')}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-tight text-primary">{t('Dashboard.stats.totalMonthlyMRR')}</CardTitle>
          <div className="h-8 w-8 rounded bg-primary text-white flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {displayCurrency} {totalMonthlyMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-primary/70 uppercase font-bold mt-1">
            {t('Dashboard.stats.totalMonthlyMRRDesc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
