'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import type { Opportunity, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { ScrollArea } from '../ui/scroll-area';

const CustomTooltip = ({ active, payload, label, clients, allOppsData, t }: any) => {
  if (active && payload && payload.length) {
    const clientMap = new Map(clients.map((c: Client) => [c.id, c.name]));
    const monthOpps = allOppsData[label as string] || [];
    
    const totalValue = payload.reduce((sum: number, p: any) => sum + p.value, 0);

    return (
      <div className="z-50 min-w-[16rem] max-w-xs overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
        <p className="font-bold">{label}: ${totalValue.toLocaleString()}</p>
        <div className="mt-2 space-y-1">
          {payload.slice().reverse().map((pld: any) => (pld.value > 0 &&
            <div key={pld.dataKey} className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: pld.fill }} />
              <span>{t(`Stages.${pld.dataKey}`)}:</span>
              <span className="ml-auto font-mono">${pld.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {monthOpps.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="font-semibold text-xs mb-1">
              {t('Dashboard.recentOpportunities.opportunityHeader', { count: monthOpps.length })}:
            </p>
            <ScrollArea className="h-full max-h-32">
              <ul className="space-y-1 pr-4">
                {monthOpps.map((opp: Opportunity) => (
                  <li key={opp.id} className="text-xs text-muted-foreground truncate">
                    {clientMap.get(opp.clientId)} - {opp.title}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  }

  return null;
};


export function OpportunitiesChart({ opportunities, clients }: { opportunities: Opportunity[], clients: Client[] }) {
  const { t } = useI18n();
  
  const { chartData, allOppsData } = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(new Date().getFullYear(), i, 1);
        return date.toLocaleString('default', { month: 'short' });
    });

    const stages: Opportunity['stage'][] = [
      'Prospecting',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
      'Canceled',
      'Suspended'
    ];

    const currentYear = new Date().getFullYear();
    
    const yearlyData: {[key: string]: any} = {};
    const allOppsData: {[key: string]: Opportunity[]} = {};

    months.forEach(month => {
        yearlyData[month] = { month };
        stages.forEach(stage => {
            yearlyData[month][stage] = 0;
        });
        allOppsData[month] = [];
    });

    opportunities.forEach(opp => {
      if (new Date(opp.closeDate).getFullYear() === currentYear) {
        const month = new Date(opp.closeDate).toLocaleString('default', { month: 'short' });
        if (yearlyData[month]) {
          yearlyData[month][opp.stage] = (yearlyData[month][opp.stage] || 0) + opp.value;
          allOppsData[month].push(opp);
        }
      }
    });

    return { chartData: Object.values(yearlyData), allOppsData };
  }, [opportunities]);

  const chartConfig = {
    Prospecting: { label: t('Stages.Prospecting'), color: 'hsl(var(--chart-1))' },
    Proposal: { label: t('Stages.Proposal'), color: 'hsl(var(--chart-2))' },
    Negotiation: { label: t('Stages.Negotiation'), color: 'hsl(var(--chart-3))' },
    Won: { label: t('Stages.Won'), color: 'hsl(var(--chart-4))' },
    Lost: { label: t('Stages.Lost'), color: 'hsl(var(--chart-5))' },
    Canceled: { label: t('Stages.Canceled'), color: 'hsl(var(--muted))' },
    Suspended: { label: t('Stages.Suspended'), color: 'hsl(var(--secondary))' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard.stats.totalRevenue')} FCV</CardTitle>
        <CardDescription>{t('Dashboard.opportunitiesChart.byMonth')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 16 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value) / 1000}k`}
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={true}
                  content={<CustomTooltip clients={clients} allOppsData={allOppsData} t={t} />}
                />
                <Legend />
                {Object.entries(chartConfig).map(([stage, config]) => (
                    <Bar key={stage} dataKey={stage} stackId="a" fill={config.color} radius={[0, 0, 0, 0]} />
                ))}
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    