'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Briefcase, Users } from 'lucide-react';
import { opportunities, clients } from '@/lib/data';
import { useI18n } from '@/firebase/client-provider';

export function StatsCards() {
  const { t } = useI18n();
  const totalRevenue = opportunities
    .filter((opp) => opp.stage === 'Won')
    .reduce((sum, opp) => sum + opp.value, 0);

  const openOpportunities = opportunities.filter(
    (opp) => opp.stage !== 'Won' && opp.stage !== 'Lost'
  ).length;

  const totalClients = clients.length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.totalRevenue')}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Dashboard.stats.totalRevenueDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.openOpportunities')}</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openOpportunities}</div>
          <p className="text-xs text-muted-foreground">
            {t('Dashboard.stats.openOpportunitiesDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.totalClients')}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{totalClients}</div>
          <p className="text-xs text-muted-foreground">{t('Dashboard.stats.totalClientsDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
