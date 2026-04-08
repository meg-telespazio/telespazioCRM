'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { ClientTable } from '@/components/clients/client-table';
import type { Client, UserProfile } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { deleteClient } from '@/lib/firestore/clients';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientImporter } from '@/components/clients/client-importer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ClientsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();

  const [isImporterOpen, setImporterOpen] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Filter clients by permission
  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    
    // El administrador ve todo el universo de clientes
    if (user.role === 'admin') return query(ref);
    
    // Todos los demás roles (Gerente, Ejecutivo, Ingeniero) ven los clientes de su propia gerencia
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const { data: usersData, loading: usersLoading } = useCollection<UserProfile>(
    useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore])
  );

  const clients = useMemo(() => {
    if (!clientsData) return [];
    
    let filtered = clientsData;
    if (showOnlyMine && user?.role === 'ejecutivo') {
      filtered = filtered.filter(c => c.assignedTo === user.uid);
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [clientsData, showOnlyMine, user]);

  const users = useMemo(() => usersData || [], [usersData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleEditClient = (client: Client) => {
    router.push(`/clients/${client.id}`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteClient(firestore, clientId);
    }
  };

  const handleAddNew = () => {
    router.push('/clients/new');
  };

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  const isLoading = clientsLoading || usersLoading;
  const isIngeniero = user?.role === 'ingeniero';
  const isEjecutivo = user?.role === 'ejecutivo';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.clients')}>
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
            <>
              <Button variant="outline" size="sm" onClick={() => setImporterOpen(true)}>
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('Importer.button')}</span>
              </Button>
              <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('Pages.addClient')}</span>
              </Button>
            </>
          )}
        </div>
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>
        ) : (
          <ClientTable 
            data={clients} 
            users={users} 
            onEdit={handleEditClient} 
            onDelete={handleDeleteClient} 
          />
        )}
      </main>
      <ClientImporter isOpen={isImporterOpen} onOpenChange={setImporterOpen} clients={clients} />
    </div>
  );
}
