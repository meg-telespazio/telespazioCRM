'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import type { Opportunity, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import {
  deleteOpportunity,
} from '@/lib/firestore/opportunities';
import { Skeleton } from '@/components/ui/skeleton';

export default function OpportunitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

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

  const { data: opportunitiesData, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);
  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const opportunities = useMemo(() => {
    if (!opportunitiesData) return [];
    // Sort by publicId descending on the client
    return [...opportunitiesData].sort((a, b) => (b.publicId || '').localeCompare(a.publicId || ''));
  }, [opportunitiesData]);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleEditOpportunity = (opportunity: Opportunity) => {
    router.push(`/opportunities/${opportunity.id}`);
  };

  const handleDeleteOpportunity = (opportunityId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteOpportunity(firestore, opportunityId);
    }
  };

  const handleAddNew = () => {
    router.push('/opportunities/new');
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  const pageIsLoading = opportunitiesLoading || clientsLoading;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.opportunities')}>
        <Button onClick={handleAddNew} disabled={clientsLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addOpportunity')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6 overflow-hidden">
        {pageIsLoading ? (
           <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-t-lg border-b">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-b-lg" />
          </div>
        ) : (
          <OpportunityTable
            data={opportunities}
            clients={clients}
            onEdit={handleEditOpportunity}
            onDelete={handleDeleteOpportunity}
          />
        )}
      </main>
    </div>
  );
}
