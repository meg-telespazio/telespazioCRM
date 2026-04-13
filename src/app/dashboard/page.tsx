
'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { ClientsSectorChart } from '@/components/dashboard/clients-sector-chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { t, currency: displayCurrency } = useI18n();
  const firestore = useFirestore();

  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const managementFilter = user?.role === 'admin' ? null : user?.management;

  // Base queries
  const opportunitiesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    return managementFilter ? query(ref, where('management', '==', managementFilter)) : query(ref);
  }, [firestore, user, managementFilter]);

  const contractsQuery = useMemo(() => {
    if (!user) return null;
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
    if (!user) return null;
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

  // Data fetching
  const { data: rawOpportunities, loading: opportunitiesLoading } = useCollection<Opportunity>(opportunitiesQuery);
  const { data: rawContracts, loading: contractsLoading } = useCollection<Contract>(contractsQuery);
  const { data: rawClients, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: rawContacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);
  const { data: rawActivities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  const { data: rawServices, loading: servicesLoading } = useCollection<Service>(servicesQuery);
  const { data: rawEquipment, loading: equipmentLoading } = useCollection<Equipment>(equipmentQuery);

  // Filtering logic
  const filteredData = useMemo(() => {
    const isEjecutivo = user?.role === 'ejecutivo';
    const filterByOwner = isEjecutivo && showOnlyMine;

    const filterFn = (item: any) => !filterByOwner || item.assignedTo === user?.uid;

    return {
      opportunities: (rawOpportunities || []).filter(filterFn),
      contracts: (rawContracts || []).filter(filterFn),
      clients: (rawClients || []).filter(filterFn),
      contacts: (rawContacts || []).filter(filterFn),
      activities: (rawActivities || []).filter(filterFn),
      services: (rawServices || []).filter(filterFn),
      equipment: (rawEquipment || []).filter(filterFn),
    };
  }, [rawOpportunities, rawContracts, rawClients, rawContacts, rawActivities, rawServices, rawEquipment, showOnlyMine, user]);

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
  const isEjecutivo = user?.role === 'ejecutivo';

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Dashboard.title')}>
        {isEjecutivo && (
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
            <Switch 
              id="mine-filter-dashboard" 
              checked={showOnlyMine} 
              onCheckedChange={setShowOnlyMine} 
            />
            <Label htmlFor="mine-filter-dashboard" className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer text-white">
              {t('Actions.showOnlyMine')}
            </Label>
          </div>
        )}
      </AppHeader>
      
      {!pageIsLoading && (
        <AlertsTicker 
          opportunities={filteredData.opportunities} 
          contracts={filteredData.contracts} 
          activities={filteredData.activities} 
        />
      )}

      <div className="flex-1 space-y-6 p-4 sm:p-6 overflow-hidden pb-24">
        {pageIsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <StatsCards
            opportunities={filteredData.opportunities}
            clients={filteredData.clients}
            contacts={filteredData.contacts}
            services={filteredData.services}
            equipment={filteredData.equipment}
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
                  opportunities={filteredData.opportunities} 
                  clients={filteredData.clients} 
                  exchangeRates={configData?.exchangeRates || []}
                  displayCurrency={displayCurrency}
                />
              )}
            </div>
            <div className="col-span-4 lg:col-span-3 min-w-0">
              {pageIsLoading ? (
                <Skeleton className="h-[425px]" />
              ) : (
                <ClientsSectorChart clients={filteredData.clients} />
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 min-w-0">
            {pageIsLoading ? (
              <Skeleton className="h-[360px]" />
            ) : (
              <RecentActivities
                activities={filteredData.activities}
                clients={filteredData.clients}
              />
            )}
          </div>
          <div className="col-span-4 lg:col-span-3 min-w-0">
            {!isIngeniero && !pageIsLoading && (
              <RecentOpportunities
                opportunities={filteredData.opportunities}
                clients={filteredData.clients}
                exchangeRates={configData?.exchangeRates || []}
                displayCurrency={displayCurrency}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
