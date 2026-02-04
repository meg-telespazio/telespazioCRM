'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { OpportunityForm } from '@/components/opportunities/opportunity-form';
import { OpportunityTable } from '@/components/opportunities/opportunity-table';
import { opportunities as initialOpportunities } from '@/lib/data';
import type { Opportunity } from '@/lib/types';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [isFormOpen, setFormOpen] = useState(false);

  const addOpportunity = (opportunity: Omit<Opportunity, 'id'>) => {
    setOpportunities((prev) => [
      ...prev,
      { ...opportunity, id: `opp-${Date.now()}` },
    ]);
  };

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
