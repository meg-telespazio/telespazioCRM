
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Activity, Client, UserProfile, ActivityType } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Calendar, Mail, MessageSquare, Clock, Activity as ActivityIcon, LayoutGrid, List } from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';
import { Button } from '@/components/ui/button';
import { ActivityTable } from '@/components/activities/activity-table';

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  message: MessageSquare,
};

export default function AllActivitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t, locale } = useI18n();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : enUS;
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const activitiesQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'activities');
    
    // Filter by management, and exclude engineers from reading financial-linked activities (if needed)
    // Here we respect the rule: admin sees all, others see their management.
    if (user.role === 'admin') {
      return query(ref, orderBy('updatedAt', 'desc'));
    }
    
    // Ingenieros can't see activities according to prompt requirements
    if (user.role === 'ingeniero') {
      return null;
    }

    return query(
      ref,
      where('management', '==', user.management),
      orderBy('updatedAt', 'desc')
    );
  }, [user, firestore]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  
  const usersQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users');
  }, [user, firestore]);

  const { data: activities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);
  
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach(client => map.set(client.id, client.name));
    return map;
  }, [clients]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users?.forEach(u => map.set(u.uid, u));
    return map;
  }, [users]);

  const isLoading = userLoading || (activitiesLoading && activitiesQuery !== null) || clientsLoading || usersLoading;
  
  const getDaysText = (days: number | null) => {
    if (days === null) return t('App.loading');
    if (days === 0) return t('Activity.updatedToday');
    if (days === 1) return t('Activity.updated1DayAgo');
    return t('Activity.updatedDaysAgo', { days });
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.activities')}>
        <div className="flex items-center">
          <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('card')}>
            <LayoutGrid />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
            <List />
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : activities && activities.length > 0 ? (
          <>
            {viewMode === 'card' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || MessageSquare;
                    const clientName = clientMap.get(activity.clientId) || 'Unknown Client';
                    const updateDate = activity.updatedAt || activity.createdAt;
                    const daysSinceUpdate = differenceInDays(new Date(), updateDate);
                    const lastUpdateAuthorId = activity.latestFollowUpBy || activity.createdBy;
                    const lastUpdateAuthor = userMap.get(lastUpdateAuthorId);
                    const lastUpdateContent = activity.latestFollowUpContent || activity.description;
                    
                    return (
                      <Card key={activity.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader 
                          onClick={() => router.push(`/clients/${activity.clientId}/activity`)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <div className="flex items-start gap-4">
                             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                              <Icon className="h-5 w-5 text-secondary-foreground" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg leading-tight">{clientName}</CardTitle>
                              <CardDescription>{t(`Activity.types.${activity.type}`)}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent 
                          className="flex-grow cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/clients/${activity.clientId}/activity`)}
                        >
                          <div className="text-sm text-muted-foreground line-clamp-4">
                             <RenderWithMentions text={lastUpdateContent} />
                          </div>
                        </CardContent>
                        <CardFooter>
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{getDaysText(daysSinceUpdate)} {lastUpdateAuthor && `by ${lastUpdateAuthor.displayName}`}</span>
                           </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <ActivityTable activities={activities} clientMap={clientMap} userMap={userMap} />
            )}
          </>
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
            <ActivityIcon className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t('Activity.noActivitiesTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {user?.role === 'ingeniero' ? 'Ingenieros no tienen acceso a este módulo.' : t('Activity.noActivitiesDescription')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
