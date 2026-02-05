'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { opportunities } from '@/lib/data';
import type { Opportunity } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

export function OpportunitiesChart() {
  const { t } = useI18n();

  const getOpportunitiesByStage = () => {
    const stages: Opportunity['stage'][] = [
      'Prospecting',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
    ];
    const data = stages.map((stage) => ({
      name: t(`Stages.${stage}`),
      total: opportunities.filter((opp) => opp.stage === stage).length,
    }));
    return data;
  };

  const data = getOpportunitiesByStage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard.opportunitiesChart.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
