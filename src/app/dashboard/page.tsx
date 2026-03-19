'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { OpportunitiesChart } from '@/components/dashboard/opportunities-chart';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Client, Contact, Activity, SystemConfig } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentActivities } from '@/components/dashboard/recent-activities';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { t, currency: displayCurrency } = useI18n();
  const firestore = useFirestore();

  const configDocRef = useMemo(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const opportunitiesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const contactsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contacts');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const activitiesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'activities');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const { data: opportunities, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);
  const { data: clients, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);
  const { data: contacts, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: activities, loading: activitiesLoading } =
    useCollection<Activity>(activitiesQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  const pageIsLoading =
    (opportunitiesLoading && opportunitiesQuery !== null) ||
    clientsLoading ||
    contactsLoading ||
    (activitiesLoading && activitiesQuery !== null) ||
    !configData;

  const isIngeniero = user?.role === 'ingeniero';

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Dashboard.title')} />
      <div className="flex-1 space-y-4 p-4 sm:p-6 overflow-hidden">
        {pageIsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <StatsCards
            opportunities={opportunities || []}
            clients={clients || []}
            contacts={contacts || []}
            exchangeRates={configData?.exchangeRates || []}
            displayCurrency={displayCurrency}
          />
        )}
        
        {!isIngeniero && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 min-w-0">
              {pageIsLoading ? (
                <Skeleton className="h-[425px]" />
              ) : (
                <OpportunitiesChart 
                  opportunities={opportunities || []} 
                  clients={clients || []} 
                  exchangeRates={configData?.exchangeRates || []}
                  displayCurrency={displayCurrency}
                />
              )}
            </div>
            <div className="col-span-4 lg:col-span-3 min-w-0">
              {pageIsLoading ? (
                <Skeleton className="h-[360px]" />
              ) : (
                <RecentOpportunities
                  opportunities={opportunities || []}
                  clients={clients || []}
                  exchangeRates={configData?.exchangeRates || []}
                  displayCurrency={displayCurrency}
                />
              )}
            </div>
          </div>
        )}

        <div className="min-w-0">
          {pageIsLoading ? (
            <Skeleton className="h-[360px]" />
          ) : !isIngeniero ? (
            <RecentActivities
              activities={activities || []}
              clients={clients || []}
            />
          ) : (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              Dashboard simplificado para Ingeniería. Las métricas de ventas y actividades comerciales están restringidas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
