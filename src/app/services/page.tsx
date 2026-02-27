
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Upload, Zap } from 'lucide-react';
import type { Service, PurchaseOrder } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServiceImporter } from '@/components/services/service-importer';

export default function ServicesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const [isImporterOpen, setImporterOpen] = useState(false);

  const servicesQuery = useMemo(() => user ? query(collection(firestore, 'services'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: services, loading: servicesLoading } = useCollection<Service>(servicesQuery);

  const posQuery = useMemo(() => user ? query(collection(firestore, 'purchaseOrders'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: pos } = useCollection<PurchaseOrder>(posQuery);

  if (userLoading || servicesLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Services.title')}>
        <Button variant="outline" onClick={() => setImporterOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('Services.import')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Forms.serviceNickname')}</TableHead>
                <TableHead>{t('Forms.serviceLineNumber')}</TableHead>
                <TableHead>{t('Forms.servicePlan')}</TableHead>
                <TableHead>{t('Forms.poNumber')}</TableHead>
                <TableHead>{t('Forms.userTerminal')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services && services.length > 0 ? services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">{s.serviceNickname}</TableCell>
                  <TableCell className="text-xs font-mono">{s.serviceLineNumber}</TableCell>
                  <TableCell>{s.servicePlan}</TableCell>
                  <TableCell className="font-medium text-primary">{s.poId}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{s.equipmentId}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t('Services.noServices')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      <ServiceImporter 
        isOpen={isImporterOpen} 
        onOpenChange={setImporterOpen} 
        pos={pos || []} 
      />
    </div>
  );
}
