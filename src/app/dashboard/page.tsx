'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { OpportunitiesChart } from '@/components/dashboard/opportunities-chart';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';
import { useI18n } from '@/firebase/client-provider';
import type { Opportunity, Client, Contact, Activity, SystemConfig, Contract, Service, Equipment, UserProfile } from '@/lib/types';
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

  const [showOnlyMine, setShowOnlyMine] = useState(true);

  // Perfil de usuario y config del sistema
  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  // Bandera crítica: Solo cargamos datos si el usuario está completamente listo y tiene su gerencia definida
  const canLoadData = !userLoading && !!user && (!!user.management || user.role === 'admin');
  const managementFilter = user?.role === 'admin' ? null : user?.management;
  const isEjecutivo = user?.role === 'ejecutivo';

  // Base queries con memoización para evitar re-renders y errores de permisos por cambios de instancia
  // Para Ejecutivos, SIEMPRE filtramos por assignedTo en el Dashboard para evitar errores de reglas
  const opportunitiesQuery = useMemoFirebase(() => {
    if (!canLoadData || user?.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const contractsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'contracts');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const clientsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'clients');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const contactsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'contacts');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'activities');
    
    if (user?.role === 'admin') return query(ref);
    
    // Ejecutivos solo ven sus propias actividades por query (y por reglas)
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const servicesQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'services');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  const equipmentQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'equipment');
    if (user?.role === 'admin') return query(ref);
    if (isEjecutivo) {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [firestore, canLoadData, user?.role, user?.uid, user?.management, isEjecutivo]);

  // Query para cargar todos los usuarios (usado en componentes de visualización)
  const usersQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    return collection(firestore, 'users');
  }, [firestore, canLoadData]);

  // Data fetching
  const { data: rawOpportunities, loading: opportunitiesLoading } = useCollection<Opportunity>(opportunitiesQuery);
  const { data: rawContracts, loading: contractsLoading } = useCollection<Contract>(contractsQuery);
  const { data: rawClients, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: rawContacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);
  const { data: rawActivities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  const { data: rawServices, loading: servicesLoading } = useCollection<Service>(servicesQuery);
  const { data: rawEquipment, loading: equipmentLoading } = useCollection<Equipment>(equipmentQuery);
  const { data: allUsers } = useCollection<UserProfile>(usersQuery);

  // Filtrado local adicional para el dashboard (solo para Admin/Gerente que no tienen filtro en query)
  const filteredData = useMemo(() => {
    if (!canLoadData) return { opportunities: [], contracts: [], clients: [], contacts: [], activities: [], services: [], equipment: [] };

    // Si es ejecutivo, las queries ya vienen filtradas, no hace falta filterFn
    if (isEjecutivo) {
      return {
        opportunities: rawOpportunities || [],
        contracts: rawContracts || [],
        clients: rawClients || [],
        contacts: rawContacts || [],
        activities: rawActivities || [],
        services: rawServices || [],
        equipment: rawEquipment || [],
      };
    }

    // Para Admin/Gerente, aplicamos el switch de "Ver solo mis registros" si está activo
    const filterFn = (item: any) => !showOnlyMine || item.assignedTo === user?.uid;

    return {
      opportunities: (rawOpportunities || []).filter(filterFn),
      contracts: (rawContracts || []).filter(filterFn),
      clients: (rawClients || []).filter(filterFn),
      contacts: (rawContacts || []).filter(filterFn),
      activities: (rawActivities || []).filter(filterFn),
      services: (rawServices || []).filter(filterFn),
      equipment: (rawEquipment || []).filter(filterFn),
    };
  }, [rawOpportunities, rawContracts, rawClients, rawContacts, rawActivities, rawServices, rawEquipment, showOnlyMine, user, canLoadData, isEjecutivo]);

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
    !canLoadData ||
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
      <AppHeader title={t('Dashboard.title')}>
        {user?.role !== 'admin' && (
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
                contacts={filteredData.contacts}
                users={allUsers || []}
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