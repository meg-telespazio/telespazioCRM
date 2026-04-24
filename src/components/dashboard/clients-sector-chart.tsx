
'use client';

import { useMemo } from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import type { Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
];

export function ClientsSectorChart({ clients }: { clients: Client[] }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    const sectors: Record<string, number> = {};
    
    clients.forEach(client => {
      const sector = client.sector || 'Sin Sector';
      sectors[sector] = (sectors[sector] || 0) + 1;
    });

    return Object.entries(sectors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [clients]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (clients.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t('Settings.sectors')}</CardTitle>
          <CardDescription>Distribución de clientes</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground italic text-sm">
          No hay datos de clientes para mostrar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('Settings.sectors')}</CardTitle>
        <CardDescription>Participación por industria</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 350}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold uppercase">{payload[0].name}</span>
                          <span className="text-muted-foreground">
                            {payload[0].value} {payload[0].value === 1 ? 'cliente' : 'clientes'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                layout={isMobile ? "horizontal" : "vertical"} 
                align={isMobile ? "center" : "right"} 
                verticalAlign={isMobile ? "bottom" : "middle"}
                formatter={(value) => <span className="text-[10px] uppercase font-bold text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
