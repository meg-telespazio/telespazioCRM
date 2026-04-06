
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, LayoutGrid, List, Contact as ContactIcon } from 'lucide-react';
import { ContactTable } from '@/components/contacts/contact-table';
import type { Contact, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { deleteContact } from '@/lib/firestore/contacts';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactImporter } from '@/components/contacts/contact-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContactCard } from '@/components/contacts/contact-card';

export default function ContactsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();

  const [isImporterOpen, setImporterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [clientFilter, setClientFilter] = useState('all');

  const contactsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contacts');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const { data: contactsData, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  const filteredContacts = useMemo(() => {
    if (!contactsData) return [];
    
    let filtered = contactsData;
    if (clientFilter !== 'all') {
      filtered = filtered.filter(contact => contact.clientId === clientFilter);
    }
    
    return [...filtered].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [contactsData, clientFilter]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    if (clientsData) {
        clientsData.forEach(client => map.set(client.id, client));
    }
    return map;
  }, [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleEditContact = (contact: Contact) => {
    router.push(`/contacts/${contact.id}`);
  };

  const handleDeleteContact = (contactId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteContact(firestore, contactId);
    }
  };

  const handleAddNew = () => {
    router.push('/contacts/new');
  };

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  const pageIsLoading = contactsLoading || clientsLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.contacts')}>
        <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="hidden sm:flex w-[180px] h-8 text-xs">
                <SelectValue placeholder={t('Forms.selectClient')} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t('Table.all')} {t('Pages.clients')}</SelectItem>
                {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>

        <div className="hidden sm:flex items-center rounded-md bg-muted p-1">
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2" onClick={() => setViewMode('table')}>
                <List className="h-3.5 w-3.5" />
            </Button>
            <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2" onClick={() => setViewMode('card')}>
                <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImporterOpen(true)}
          disabled={user?.role === 'ingeniero'}
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('Importer.button')}</span>
        </Button>
        <Button size="sm" onClick={handleAddNew} disabled={user?.role === 'ingeniero'}>
          <PlusCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('Pages.addContact')}</span>
        </Button>
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {pageIsLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-t-lg border-b bg-card p-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-b-lg" />
          </div>
        ) : viewMode === 'table' ? (
          <ContactTable
              data={filteredContacts}
              clients={clients}
              onEdit={handleEditContact}
              onDelete={handleDeleteContact}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredContacts.map(contact => (
              <ContactCard key={contact.id} contact={contact} client={clientMap.get(contact.clientId)} onEdit={handleEditContact} onDelete={handleDeleteContact} />
            ))}
          </div>
        )}
         { !pageIsLoading && filteredContacts.length === 0 && (
             <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <ContactIcon className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{t('Table.noResults')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('Importer.noContactsDescription')}</p>
             </div>
         )}
      </main>
      <ContactImporter
        isOpen={isImporterOpen}
        onOpenChange={setImporterOpen}
        clients={clients}
        contacts={contactsData || []}
      />
    </div>
  );
}
