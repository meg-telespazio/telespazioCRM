'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import type { Opportunity, Client, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { deleteOpportunity, duplicateOpportunity } from '@/lib/firestore/opportunities';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function OpportunitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t, currency: displayCurrency } = useI18n();
  const { toast } = useToast();

  const [showOnlyMine, setShowOnlyMine] = useState(true);

  // Guard: Only load if user and their management area is ready
  const canLoadData = !userLoading && !!user && (user.role === 'admin' || !!user.management);

  const configDocRef = useMemo(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
    if (user && user.role === 'ingeniero') redirect('/dashboard');
  }, [user, userLoading]);

  // Data fetching - Using useMemoFirebase for stability and guards
  const oppsQuery = useMemoFirebase(() => {
    if (!canLoadData || user?.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    if (user?.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user?.management));
  }, [canLoadData, user?.role, user?.management, firestore]);

  const clientsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'clients');
    if (user?.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user?.management));
  }, [canLoadData, user?.role, user?.management, firestore]);

  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(oppsQuery);
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const opportunities = useMemo(() => {
    if (!opportunitiesData) return [];
    
    let filtered = opportunitiesData;
    if (showOnlyMine && user?.role === 'ejecutivo') {
      filtered = filtered.filter(opp => opp.assignedTo === user.uid);
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [opportunitiesData, showOnlyMine, user]);

  const clients = useMemo(() => clientsData || [], [clientsData]);

  const handleEditOpportunity = (opportunity: Opportunity) => {
    router.push(`/opportunities/${opportunity.id}`);
  };

  const handleDeleteOpportunity = (opportunityId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteOpportunity(firestore, opportunityId);
    }
  };

  const handleDuplicateOpportunity = async (opportunity: Opportunity) => {
    if (!user) return;
    try {
      await duplicateOpportunity(firestore, user.uid, opportunity);
      toast({
        variant: 'success',
        title: 'Negocio duplicado',
        description: `Se ha creado una copia de "${opportunity.title}" con éxito.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al duplicar',
        description: error.message,
      });
    }
  };

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  const isEjecutivo = user?.role === 'ejecutivo';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.opportunities')}>
        <div className="flex items-center gap-4 mr-4">
          {isEjecutivo && (
            <div className="flex items-center gap-2.5 bg-muted/50 px-3 py-1.5 rounded-full border border-border/60 shadow-sm">
              <Switch 
                id="mine-filter" 
                checked={showOnlyMine} 
                onCheckedChange={setShowOnlyMine} 
              />
              <Label htmlFor="mine-filter" className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                {t('Actions.showOnlyMine')}
              </Label>
            </div>
          )}
          <Button size="sm" onClick={() => router.push('/opportunities/new')} disabled={user?.role === 'ingeniero'}>
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('Pages.addOpportunity')}</span>
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {(!canLoadData || (opportunitiesLoading && oppsQuery !== null) || clientsLoading) ? (
           <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>
        ) : user?.role === 'ingeniero' ? (
          <div className="text-center py-20 text-muted-foreground">No tienes permisos para ver este módulo.</div>
        ) : (
          <OpportunityTable 
            data={opportunities} 
            clients={clients} 
            onEdit={handleEditOpportunity} 
            onDelete={handleDeleteOpportunity}
            onDuplicate={handleDuplicateOpportunity}
            exchangeRates={configData?.exchangeRates || []}
            displayCurrency={displayCurrency}
          />
        )}
      </main>
    </div>
  );
}
