'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { Opportunity } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

export function OpportunitiesChart({ opportunities }: { opportunities: Opportunity[] }) {
  const { t } = useI18n();

  const getOpportunitiesByStage = () => {
    const stages: Opportunity['stage'][] = [
      'Prospecting',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
      'Canceled',
      'Suspended'
    ];
    const data = stages.map((stage) => ({
      name: t(`Stages.${stage}`),
      total: opportunities.filter((opp) => opp.stage === stage).length,
    }));
    return data;
  };

  const data = getOpportunitiesByStage();

  const chartConfig = {
    total: {
      label: t('Table.totals'),
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard.opportunitiesChart.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
