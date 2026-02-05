'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import { ClientTable } from '@/components/clients/client-table';
import { clients as initialClients } from '@/lib/data';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const { user, loading } = useUser();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isFormOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  const addClient = (client: Omit<Client, 'id'>) => {
    setClients((prev) => [
      ...prev,
      { ...client, id: `cli-${Date.now()}` },
    ]);
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Clients">
        <Button onClick={() => setFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <ClientTable data={clients} />
      </main>
      <ClientForm
        isOpen={isFormOpen}
        onOpenChange={setFormOpen}
        onSave={addClient}
      />
    </div>
  );
}
