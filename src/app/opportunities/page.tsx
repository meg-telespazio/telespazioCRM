'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityForm } from '@/components/opportunities/opportunity-form';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import type { Opportunity, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import {
  addOpportunity,
  updateOpportunity,
  deleteOpportunity,
} from '@/lib/firestore/opportunities';
import { Skeleton } from '@/components/ui/skeleton';

export default function OpportunitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] =
    useState<Opportunity | null>(null);

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const opportunitiesQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(
      collection(firestore, 'opportunities'),
      baseQuery,
      orderBy('createdAt', 'desc')
    );
  }, [firestore, baseQuery]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(
      collection(firestore, 'clients'),
      baseQuery,
      orderBy('name', 'asc')
    );
  }, [firestore, baseQuery]);

  const { data: opportunities, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);
  const { data: clients, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleSaveOpportunity = (
    opportunityData: Omit<Opportunity, 'id' | 'createdAt' | 'createdBy'>
  ) => {
    if (!user) return;
    if (editingOpportunity) {
      updateOpportunity(firestore, editingOpportunity.id, opportunityData);
    } else {
      addOpportunity(firestore, user.uid, opportunityData);
    }
    setEditingOpportunity(null);
    setFormOpen(false);
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormOpen(true);
  };

  const handleDeleteOpportunity = (opportunityId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteOpportunity(firestore, opportunityId);
    }
  };

  const handleFormOpenChange = (isOpen: boolean) => {
    setFormOpen(isOpen);
    if (!isOpen) {
      setEditingOpportunity(null);
    }
  };

  const handleAddNew = () => {
    setEditingOpportunity(null);
    setFormOpen(true);
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
      <main className="flex-1 p-4 sm:p-6">
        {pageIsLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <OpportunityTable
            data={opportunities || []}
            clients={clients || []}
            onEdit={handleEditOpportunity}
            onDelete={handleDeleteOpportunity}
          />
        )}
      </main>
      <OpportunityForm
        key={editingOpportunity?.id || 'new'}
        isOpen={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSaveOpportunity}
        defaultValues={editingOpportunity || undefined}
        clients={clients || []}
      />
    </div>
  );
}
