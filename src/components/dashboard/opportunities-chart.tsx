'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';
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
import { useIsMobile } from '@/hooks/use-mobile';

export function OpportunitiesChart({ opportunities }: { opportunities: Opportunity[] }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

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
          {isMobile ? (
             <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 5, right: 35 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide domain={[0, 'dataMax + 1']}/>
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                    tick={{ fontSize: 11 }}
                    width={90}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={4}>
                    <LabelList
                        dataKey="total"
                        position="right"
                        offset={8}
                        className="fill-foreground"
                        fontSize={12}
                    />
                </Bar>
             </BarChart>
          ) : (
            <BarChart accessibilityLayer data={data} margin={{ right: 16 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
