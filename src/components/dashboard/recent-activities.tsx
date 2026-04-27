'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Activity, Client, ActivityType, UserProfile, Contact } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Phone, Calendar, Mail, MessageSquare } from 'lucide-react';
import { RenderWithMentions } from '../activity/render-with-mentions';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  message: MessageSquare,
};

type RecentActivitiesProps = {
  activities: Activity[];
  clients: Client[];
  contacts: Contact[];
  users: UserProfile[];
};

export function RecentActivities({
  activities,
  clients,
  contacts,
  users,
}: RecentActivitiesProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : enUS;

  const recentActivities = useMemo(() => {
    return [...(activities || [])]
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [activities]);

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown Client';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard.recentActivities.title')}</CardTitle>
        <CardDescription>
          {t('Dashboard.recentActivities.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('Dashboard.recentActivities.activityHeader')}
              </TableHead>
              <TableHead>
                {t('Dashboard.recentActivities.clientHeader')}
              </TableHead>
              <TableHead className="text-right">
                {t('Dashboard.recentActivities.dateHeader')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActivities.map((activity) => {
              const Icon = activityIcons[activity.type] || MessageSquare;
              const displayDate = activity.updatedAt || activity.createdAt;
              return (
                <TableRow
                  key={activity.id}
                  onClick={() =>
                    router.push(`/clients/${activity.clientId}/activity`)
                  }
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <Icon className="mt-1 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {t(`Activity.types.${activity.type}`)}
                        </p>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          <RenderWithMentions text={activity.description} users={users} contacts={contacts} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="truncate max-w-24 sm:max-w-xs">
                    {getClientName(activity.clientId)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDistanceToNow(displayDate, {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
            {recentActivities.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                  {t('Activity.noActivitiesTitle')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}