'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Briefcase, Target, Contact as ContactIcon } from 'lucide-react';
import type { Opportunity, Client, Contact } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

type StatsCardsProps = {
    opportunities: Opportunity[];
    clients: Client[];
    contacts: Contact[];
}

export function StatsCards({ opportunities, clients, contacts }: StatsCardsProps) {
  const { t } = useI18n();
  
  const totalRevenue = opportunities
    .filter((opp) => opp.stage === 'Won')
    .reduce((sum, opp) => sum + opp.value, 0);

  const totalWon = opportunities.filter(opp => opp.stage === 'Won').length;
  const totalOpportunities = opportunities.length;
  const closeRate = totalOpportunities > 0 ? (totalWon / totalOpportunities) * 100 : 0;

  const openOpportunities = opportunities.filter(
    (opp) => !['Won', 'Lost', 'Canceled', 'Suspended'].includes(opp.stage)
  );
  const now = new Date();
  const overdueCount = openOpportunities.filter(opp => new Date(opp.closeDate) < now).length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newContactsCount = contacts.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.closeRate')}</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {closeRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Dashboard.stats.closeRateDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.openOpportunities')}</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openOpportunities.length} {overdueCount > 0 ? `(${overdueCount} ${t('Dashboard.stats.overdue')})` : ''}</div>
          <p className="text-xs text-muted-foreground">
            {t('Dashboard.stats.openOpportunitiesDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('Dashboard.stats.newContacts')}</CardTitle>
          <ContactIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{newContactsCount}</div>
          <p className="text-xs text-muted-foreground">{t('Dashboard.stats.newContactsDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
