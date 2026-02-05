'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityForm } from '@/components/opportunities/opportunity-form';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import { opportunities as initialOpportunities } from '@/lib/data';
import type { Opportunity } from '@/lib/types';

export default function OpportunitiesPage() {
  const { user, loading } = useUser();
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(initialOpportunities);
  const [isFormOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  const addOpportunity = (opportunity: Omit<Opportunity, 'id'>) => {
    setOpportunities((prev) => [
      ...prev,
      { ...opportunity, id: `opp-${Date.now()}` },
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
      <AppHeader title="Opportunities">
        <Button onClick={() => setFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Opportunity
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <OpportunityTable data={opportunities} />
      </main>
      <OpportunityForm
        isOpen={isFormOpen}
        onOpenChange={setFormOpen}
        onSave={addOpportunity}
      />
    </div>
  );
}
