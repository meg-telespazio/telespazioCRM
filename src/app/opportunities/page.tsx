
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import type { Opportunity, Client, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { deleteOpportunity } from '@/lib/firestore/opportunities';
import { Skeleton } from '@/components/ui/skeleton';

export default function OpportunitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t, currency: displayCurrency } = useI18n();

  const configDocRef = useMemo(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const oppsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'opportunities');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(oppsQuery);
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const opportunities = useMemo(() => {
    if (!opportunitiesData) return [];
    return [...opportunitiesData].sort((a, b) => (b.publicId || '').localeCompare(a.publicId || ''));
  }, [opportunitiesData]);

  const clients = useMemo(() => clientsData || [], [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
    if (user?.role === 'ingeniero') redirect('/dashboard');
  }, [user, userLoading]);

  const handleEditOpportunity = (opportunity: Opportunity) => {
    router.push(`/opportunities/${opportunity.id}`);
  };

  const handleDeleteOpportunity = (opportunityId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteOpportunity(firestore, opportunityId);
    }
  };

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.opportunities')}>
        <Button onClick={() => router.push('/opportunities/new')} disabled={user?.role === 'ingeniero'}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addOpportunity')}
        </Button>
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {opportunitiesLoading || clientsLoading || !configData ? (
           <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>
        ) : (
          <OpportunityTable 
            data={opportunities} 
            clients={clients} 
            onEdit={handleEditOpportunity} 
            onDelete={handleDeleteOpportunity}
            exchangeRates={configData.exchangeRates || []}
            displayCurrency={displayCurrency}
          />
        )}
      </main>
    </div>
  );
}
