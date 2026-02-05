'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactTable } from '@/components/contacts/contact-table';
import { contacts as initialContacts } from '@/lib/data';
import type { Contact } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

export default function ContactsPage() {
  const { user, loading } = useUser();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isFormOpen, setFormOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  const addContact = (contact: Omit<Contact, 'id'>) => {
    setContacts((prev) => [
      ...prev,
      { ...contact, id: `con-${Date.now()}` },
    ]);
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.contacts')}>
        <Button onClick={() => setFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Pages.addContact')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <ContactTable data={contacts} />
      </main>
      <ContactForm
        isOpen={isFormOpen}
        onOpenChange={setFormOpen}
        onSave={addContact}
      />
    </div>
  );
}
