
'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { OpportunitiesChart } from '@/components/dashboard/opportunities-chart';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Client, Contact, Activity, SystemConfig, Contract, Service, Equipment } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentActivities } from '@/components/dashboard/recent-activities';
import { AlertsTicker } from '@/components/dashboard/alerts-ticker';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { t, currency: displayCurrency } = useI18n();
  const firestore = useFirestore();

  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const managementFilter = user?.role === 'admin' ? null : user?.management;

  const opportunitiesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const contractsQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'contracts');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const contactsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contacts');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const activitiesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'activities');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const servicesQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'services');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const equipmentQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'equipment');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const { data: opportunities, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);
  const { data: contracts, loading: contractsLoading } =
    useCollection<Contract>(contractsQuery);
  const { data: clients, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);
  const { data: contacts, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: activities, loading: activitiesLoading } =
    useCollection<Activity>(activitiesQuery);
  const { data: services, loading: servicesLoading } =
    useCollection<Service>(servicesQuery);
  const { data: equipment, loading: equipmentLoading } =
    useCollection<Equipment>(equipmentQuery);

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
    (contractsLoading && contractsQuery !== null) ||
    clientsLoading ||
    contactsLoading ||
    (activitiesLoading && activitiesQuery !== null) ||
    servicesLoading ||
    equipmentLoading ||
    !configData;

  const isIngeniero = user?.role === 'ingeniero';

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Dashboard.title')} />
      
      {!isIngeniero && !pageIsLoading && (
        <AlertsTicker 
          opportunities={opportunities || []} 
          contracts={contracts || []} 
          activities={activities || []} 
        />
      )}

      <div className="flex-1 space-y-6 p-4 sm:p-6 overflow-hidden pb-24">
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
            services={services || []}
            equipment={equipment || []}
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
