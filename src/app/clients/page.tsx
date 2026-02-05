'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import { ClientTable } from '@/components/clients/client-table';
import type { Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { addClient, updateClient, deleteClient } from '@/lib/firestore/clients';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ClientImporter } from '@/components/clients/client-importer';

export default function ClientsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'clients'),
      where('createdBy', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    // Sort by publicId ascending on the client
    return [...clientsData].sort((a, b) =>
      (a.publicId || '').localeCompare(b.publicId || '')
    );
  }, [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleSaveClient = async (
    clientData: Omit<Client, 'id' | 'publicId' | 'createdAt' | 'createdBy'>
  ): Promise<true | Error> => {
    if (!user) return new Error('User not authenticated.');
    try {
      if (editingClient) {
        // publicId is not editable
        const { publicId, ...updateData } = clientData as any;
        await updateClient(firestore, editingClient.id, updateData);
      } else {
        await addClient(firestore, user.uid, clientData);
      }
      return true; // Indicate success
    } catch (error: any) {
      console.error('Failed to save client:', error);
      return error; // Return the error object
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteClient(firestore, clientId);
    }
  };

  const handleFormOpenChange = (isOpen: boolean) => {
    setFormOpen(isOpen);
    if (!isOpen) {
      setEditingClient(null);
    }
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.clients')}>
        <Button variant="outline" onClick={() => setImporterOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('Importer.button')}
        </Button>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addClient')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        {clientsLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-t-lg border-b bg-card p-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-b-lg" />
          </div>
        ) : (
          <ClientTable
            data={clients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
          />
        )}
      </main>
      <ClientForm
        key={editingClient?.id || 'new'}
        isOpen={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSaveClient}
        defaultValues={editingClient || undefined}
      />
      <ClientImporter
        isOpen={isImporterOpen}
        onOpenChange={setImporterOpen}
        clients={clients}
      />
    </div>
  );
}
