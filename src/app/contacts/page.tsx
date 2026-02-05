'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactTable } from '@/components/contacts/contact-table';
import type { Contact, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import {
  addContact,
  updateContact,
  deleteContact,
} from '@/lib/firestore/contacts';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContactsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const contactsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(
      collection(firestore, 'contacts'),
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

  const { data: contacts, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: clients, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleSaveContact = (
    contactData: Omit<Contact, 'id' | 'createdAt' | 'createdBy'>
  ) => {
    if (!user) return;
    if (editingContact) {
      updateContact(firestore, editingContact.id, contactData);
    } else {
      addContact(firestore, user.uid, contactData);
    }
    setEditingContact(null);
    setFormOpen(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleDeleteContact = (contactId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteContact(firestore, contactId);
    }
  };

  const handleFormOpenChange = (isOpen: boolean) => {
    setFormOpen(isOpen);
    if (!isOpen) {
      setEditingContact(null);
    }
  };

  const handleAddNew = () => {
    setEditingContact(null);
    setFormOpen(true);
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
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.contacts')}>
        <Button onClick={handleAddNew} disabled={clientsLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addContact')}
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
          <ContactTable
            data={contacts || []}
            clients={clients || []}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
          />
        )}
      </main>
      <ContactForm
        key={editingContact?.id || 'new'}
        isOpen={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSaveContact}
        defaultValues={editingContact || undefined}
        clients={clients || []}
      />
    </div>
  );
}
