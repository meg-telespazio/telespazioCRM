
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Briefcase, 
  FileText, 
  Activity as ActivityIcon,
  ShieldAlert
} from 'lucide-react';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Contract, Activity } from '@/lib/types';
import { isBefore, addDays, startOfDay, format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AlertsSectionProps {
  opportunities: Opportunity[];
  contracts: Contract[];
  activities: Activity[];
}

export function AlertsSection({ opportunities, contracts, activities }: AlertsSectionProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : enUS;

  const alerts = useMemo(() => {
    const today = startOfDay(new Date());
    const soonThreshold = addDays(today, 30);
    const list: any[] = [];

    // Overdue Opportunities
    opportunities.forEach(o => {
      if (!['Won', 'Lost', 'Canceled', 'Suspended'].includes(o.stage) && isBefore(o.closeDate, today)) {
        list.push({
          id: o.id,
          type: 'opportunity',
          title: o.title,
          subTitle: o.publicId,
          date: o.closeDate,
          status: 'overdue',
          link: `/opportunities/${o.id}`,
          label: t('Dashboard.alerts.overdueOpportunity')
        });
      }
    });

    // Overdue or Expiring Contracts
    contracts.forEach(c => {
      if (isBefore(c.endDate, today)) {
        list.push({
          id: c.id,
          type: 'contract',
          title: `${c.publicId} (${c.type})`,
          subTitle: c.status,
          date: c.endDate,
          status: 'overdue',
          link: `/contracts/${c.id}`,
          label: t('Dashboard.alerts.expiredContract')
        });
      } else if (isBefore(c.endDate, soonThreshold)) {
        list.push({
          id: c.id,
          type: 'contract',
          title: `${c.publicId} (${c.type})`,
          subTitle: c.status,
          date: c.endDate,
          status: 'soon',
          link: `/contracts/${c.id}`,
          label: t('Dashboard.alerts.expiringContract')
        });
      }
    });

    // Overdue Activities
    activities.forEach(a => {
      if (a.dueDate && isBefore(a.dueDate, today)) {
        list.push({
          id: a.id,
          type: 'activity',
          title: a.description,
          subTitle: t(`Activity.types.${a.type}`),
          date: a.dueDate,
          status: 'overdue',
          link: `/clients/${a.clientId}/activity`,
          label: t('Dashboard.alerts.overdueActivity')
        });
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [opportunities, contracts, activities, t]);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30 overflow-hidden">
      <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base text-amber-900">{t('Dashboard.alerts.title')}</CardTitle>
        </div>
        <CardDescription className="text-amber-700/70">
          {t('Dashboard.alerts.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-amber-100">
          {alerts.map((alert, idx) => {
            const isOverdue = alert.status === 'overdue';
            return (
              <div 
                key={`${alert.type}-${alert.id}-${idx}`} 
                className={cn(
                  "flex items-center justify-between p-4 transition-colors hover:bg-amber-100/50",
                  isOverdue ? "border-l-4 border-l-destructive" : "border-l-4 border-l-blue-500"
                )}
              >
                <div className="flex items-start gap-4 overflow-hidden">
                  <div className={cn(
                    "p-2 rounded-full mt-0.5 shrink-0",
                    isOverdue ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {alert.type === 'opportunity' ? <Briefcase className="h-4 w-4" /> : 
                     alert.type === 'contract' ? <FileText className="h-4 w-4" /> : 
                     <ActivityIcon className="h-4 w-4" />}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isOverdue ? "text-red-700" : "text-blue-700"
                      )}>
                        {alert.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        • {format(alert.date, 'PPP', { locale: dateLocale })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate pr-4">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.subTitle}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={cn(
                    "shrink-0 gap-1",
                    isOverdue ? "text-red-700 hover:text-red-800 hover:bg-red-50" : "text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                  )}
                  onClick={() => router.push(alert.link)}
                >
                  <span className="hidden sm:inline">Revisar</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
