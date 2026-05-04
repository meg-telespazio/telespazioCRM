'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, Filter } from 'lucide-react';
import { ClientTable } from '@/components/clients/client-table';
import type { Client, UserProfile, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { deleteClient } from '@/lib/firestore/clients';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientImporter } from '@/components/clients/client-importer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClientsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();

  const [isImporterOpen, setImporterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'prospect'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  // Fetch System Config for Sectors
  const configDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  // Filter clients by permission
  const clientsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    
    if (user.role === 'admin') return query(ref);
    if (user.role === 'ejecutivo') {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const { data: usersData, loading: usersLoading } = useCollection<UserProfile>(
    useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore])
  );

  const filteredClients = useMemo(() => {
    if (!clientsData) return [];
    
    return clientsData.filter(client => {
      const matchesType = typeFilter === 'all' || client.type === typeFilter;
      const matchesSector = sectorFilter === 'all' || client.sector === sectorFilter;
      return matchesType && matchesSector;
    }).sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [clientsData, typeFilter, sectorFilter]);

  const users = useMemo(() => usersData || [], [usersData]);
  const sectorOptions = useMemo(() => (configData?.sectors || []).sort(), [configData]);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.clients')}>
        <div className="flex items-center gap-4">
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

      <div className="bg-white border-b px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="w-full sm:w-auto">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="all" className="text-xs">{t('Table.all')}</TabsTrigger>
              <TabsTrigger value="client" className="text-xs">{t('ClientType.client')}</TabsTrigger>
              <TabsTrigger value="prospect" className="text-xs">{t('ClientType.prospect')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden sm:flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="Filtrar por sector..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sectores</SelectItem>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="sm:hidden w-full">
           <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Sector..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sectores</SelectItem>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>
        ) : (
          <ClientTable 
            data={filteredClients} 
            users={users} 
            onEdit={handleEditClient} 
            onDelete={handleDeleteClient} 
          />
        )}
      </main>
      <ClientImporter isOpen={isImporterOpen} onOpenChange={setImporterOpen} clients={filteredClients} />
    </div>
  );
}
