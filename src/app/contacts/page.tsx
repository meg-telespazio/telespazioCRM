'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactTable } from '@/components/contacts/contact-table';
import { contacts as initialContacts } from '@/lib/data';
import type { Contact } from '@/lib/types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isFormOpen, setFormOpen] = useState(false);

  const addContact = (contact: Omit<Contact, 'id'>) => {
    setContacts((prev) => [
      ...prev,
      { ...contact, id: `con-${Date.now()}` },
    ]);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Contacts">
        <Button onClick={() => setFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Contact
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
