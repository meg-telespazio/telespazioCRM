'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Contract, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { deleteContract } from '@/lib/firestore/contracts';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractTable } from '@/components/contracts/contract-table';

export default function ContractsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const contractsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'contracts'), baseQuery);
  }, [firestore, baseQuery]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'clients'), baseQuery);
  }, [firestore, baseQuery]);

  const { data: contractsData, loading: contractsLoading } = useCollection<Contract>(contractsQuery);
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const contracts = useMemo(() => {
    if (!contractsData) return [];
    return [...contractsData].sort((a, b) => (b.publicId || '').localeCompare(a.publicId || ''));
  }, [contractsData]);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleEditContract = (contract: Contract) => {
    router.push(`/contracts/${contract.id}`);
  };

  const handleDeleteContract = (contractId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteContract(firestore, contractId);
    }
  };

  const handleAddNew = () => {
    router.push('/contracts/new');
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  const pageIsLoading = contractsLoading || clientsLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.contracts')}>
        <Button onClick={handleAddNew} disabled={clientsLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addContract')}
        </Button>
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {pageIsLoading ? (
           <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-t-lg border-b">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-b-lg" />
          </div>
        ) : (
          <ContractTable
            data={contracts}
            clients={clients}
            onEdit={handleEditContract}
            onDelete={handleDeleteContract}
          />
        )}
      </main>
    </div>
  );
}
