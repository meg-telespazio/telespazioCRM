'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertCircle, 
  Clock, 
  Briefcase, 
  FileText, 
  Activity as ActivityIcon,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Contract, Activity } from '@/lib/types';
import { isBefore, addDays, startOfDay, format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AlertsTickerProps {
  opportunities: Opportunity[];
  contracts: Contract[];
  activities: Activity[];
}

export function AlertsTicker({ opportunities, contracts, activities }: AlertsTickerProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : enUS;

  const alerts = useMemo(() => {
    const today = startOfDay(new Date());
    const soonThreshold = addDays(today, 60);
    const list: any[] = [];

    // Oportunidades Vencidas
    opportunities.forEach(o => {
      if (!['Won', 'Lost', 'Canceled', 'Suspended'].includes(o.stage) && isBefore(o.closeDate, today)) {
        list.push({
          id: o.id,
          type: 'opportunity',
          title: o.title,
          date: o.closeDate,
          status: 'overdue',
          link: `/opportunities/${o.id}`,
          label: t('Dashboard.alerts.overdueOpportunity')
        });
      }
    });

    // Contratos Vencidos o por vencer
    contracts.forEach(c => {
      if (isBefore(c.endDate, today)) {
        list.push({
          id: c.id,
          type: 'contract',
          title: `${c.publicId} (${c.type})`,
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
          date: c.endDate,
          status: 'soon',
          link: `/contracts/${c.id}`,
          label: t('Dashboard.alerts.expiringContract')
        });
      }
    });

    // Actividades Vencidas (Solo si no han sido atendidas post-vencimiento)
    activities.forEach(a => {
      if (a.dueDate && isBefore(a.dueDate, today)) {
        const lastActionDate = a.updatedAt || a.createdAt;
        const isHandled = lastActionDate > a.dueDate;

        if (!isHandled) {
          list.push({
            id: a.id,
            type: 'activity',
            title: a.description,
            date: a.dueDate,
            status: 'overdue',
            link: `/clients/${a.clientId}/activity`,
            label: t('Dashboard.alerts.overdueActivity')
          });
        }
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [opportunities, contracts, activities, t]);

  if (alerts.length === 0) return null;

  // Repetimos la lista para el efecto de marquee infinito
  const displayAlerts = [...alerts, ...alerts];

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 overflow-hidden relative">
      <div className="flex items-center h-10">
        <div className="flex items-center gap-2 px-4 border-r border-amber-200 bg-amber-50 shrink-0 z-10 shadow-[5px_0_10px_-5px_rgba(0,0,0,0.1)]">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] font-bold uppercase text-amber-900 tracking-tighter whitespace-nowrap">
            {t('Dashboard.alerts.title')} ({alerts.length})
          </span>
        </div>
        
        <div className="flex animate-marquee whitespace-nowrap items-center hover:[animation-play-state:paused] cursor-default">
          {displayAlerts.map((alert, idx) => (
            <button
              key={`${alert.type}-${alert.id}-${idx}`}
              onClick={() => router.push(alert.link)}
              className="flex items-center gap-2 px-6 py-1 transition-colors hover:bg-amber-100/50 group/item"
            >
              <Badge variant="outline" className={cn(
                "text-[8px] h-4 py-0 uppercase font-bold shrink-0",
                alert.status === 'overdue' ? "bg-red-100 text-red-700 border-red-200" : "bg-blue-100 text-blue-700 border-blue-200"
              )}>
                {alert.label}
              </Badge>
              <span className="text-xs font-bold text-amber-900 max-w-[300px] truncate">{alert.title}</span>
              <span className="text-[10px] text-amber-700/70 font-medium shrink-0">({format(alert.date, 'dd/MM', { locale: dateLocale })})</span>
              <ArrowRight className="h-3 w-3 text-amber-400 group-hover/item:translate-x-1 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
