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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ContractsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const contractsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contracts');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const { data: contractsData, loading: contractsLoading } = useCollection<Contract>(contractsQuery);
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const contracts = useMemo(() => {
    if (!contractsData) return [];
    
    let filtered = contractsData;
    if (showOnlyMine && user?.role === 'ejecutivo') {
      filtered = filtered.filter(c => c.assignedTo === user.uid);
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [contractsData, showOnlyMine, user]);

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
  const isIngeniero = user?.role === 'ingeniero';
  const isEjecutivo = user?.role === 'ejecutivo';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.contracts')}>
        <div className="flex items-center gap-4">
          {isEjecutivo && (
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <Switch 
                id="mine-filter" 
                checked={showOnlyMine} 
                onCheckedChange={setShowOnlyMine} 
              />
              <Label htmlFor="mine-filter" className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer">
                {t('Actions.showOnlyMine')}
              </Label>
            </div>
          )}
          {!isIngeniero && (
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('Pages.addContract')}</span>
            </Button>
          )}
        </div>
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
