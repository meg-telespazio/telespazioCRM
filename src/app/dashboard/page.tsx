'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { OpportunitiesChart } from '@/components/dashboard/opportunities-chart';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Client, Contact } from '@/lib/types';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { t } = useI18n();
  const firestore = useFirestore();

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const opportunitiesQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'opportunities'), baseQuery);
  }, [firestore, baseQuery]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'clients'), baseQuery);
  }, [firestore, baseQuery]);
  
  const contactsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'contacts'), baseQuery);
  }, [firestore, baseQuery]);

  const { data: opportunities, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);
  const { data: clients, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);
  const { data: contacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

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
  
  const pageIsLoading = opportunitiesLoading || clientsLoading || contactsLoading;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Dashboard.title')} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {pageIsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
        ) : (
            <StatsCards opportunities={opportunities || []} clients={clients || []} contacts={contacts || []} />
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
             {pageIsLoading ? <Skeleton className="h-[425px]" /> : <OpportunitiesChart opportunities={opportunities || []} />}
          </div>
          <div className="col-span-4 lg:col-span-3">
            {pageIsLoading ? <Skeleton className="h-[360px]" /> : <RecentOpportunities opportunities={opportunities || []} clients={clients || []}/>}
          </div>
        </div>
      </div>
    </div>
  );
}
