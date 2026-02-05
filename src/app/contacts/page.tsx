'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactTable } from '@/components/contacts/contact-table';
import type { Contact, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import {
  addContact,
  updateContact,
  deleteContact,
} from '@/lib/firestore/contacts';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactImporter } from '@/components/contacts/contact-importer';

export default function ContactsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();

  const [isFormOpen, setFormOpen] = useState(false);
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const contactsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'contacts'), baseQuery);
  }, [firestore, baseQuery]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'clients'), baseQuery);
  }, [firestore, baseQuery]);

  const { data: contactsData, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const contacts = useMemo(() => {
    if (!contactsData) return [];
    // Sort by publicId ascending on the client
    return [...contactsData].sort((a, b) =>
      (a.publicId || '').localeCompare(b.publicId || '')
    );
  }, [contactsData]);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleSaveContact = async (
    contactData: Omit<Contact, 'id' | 'publicId' | 'createdAt' | 'createdBy'>
  ) => {
    if (!user) return;
    if (editingContact) {
      const { publicId, ...updateData } = contactData as any;
      updateContact(firestore, editingContact.id, updateData);
    } else {
      try {
        await addContact(firestore, user.uid, contactData);
      } catch (error) {
        console.error('Failed to add contact:', error);
        // Error is globally emitted
      }
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
        <Button
          variant="outline"
          onClick={() => setImporterOpen(true)}
          disabled={clientsLoading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('Importer.button')}
        </Button>
        <Button onClick={handleAddNew} disabled={clientsLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addContact')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        {pageIsLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-t-lg border-b bg-card p-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-b-lg" />
          </div>
        ) : (
          <ContactTable
            data={contacts}
            clients={clients}
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
        clients={clients}
      />
      <ContactImporter
        isOpen={isImporterOpen}
        onOpenChange={setImporterOpen}
      />
    </div>
  );
}
