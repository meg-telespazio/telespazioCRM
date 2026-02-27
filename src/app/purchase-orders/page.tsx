
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import type { PurchaseOrder, Contract, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PurchaseOrdersPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

  const posQuery = useMemo(() => user ? query(collection(firestore, 'purchaseOrders'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: pos, loading: posLoading } = useCollection<PurchaseOrder>(posQuery);

  const contractsQuery = useMemo(() => user ? query(collection(firestore, 'contracts'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const clientsQuery = useMemo(() => user ? query(collection(firestore, 'clients'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: clients } = useCollection<Client>(clientsQuery);

  const contractMap = useMemo(() => new Map(contracts?.map(c => [c.id, c])), [contracts]);
  const clientMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);

  if (userLoading || posLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('PO.title')}>
        <Button onClick={() => router.push('/purchase-orders/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('PO.add')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Forms.poNumber')}</TableHead>
                <TableHead>{t('Pages.clients')}</TableHead>
                <TableHead>{t('Sidebar.contracts')}</TableHead>
                <TableHead>{t('Forms.amount')}</TableHead>
                <TableHead>{t('Table.status')}</TableHead>
                <TableHead>{t('Forms.emissionDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos && pos.length > 0 ? pos.map((po) => {
                const contract = contractMap.get(po.contractId);
                const client = contract ? clientMap.get(contract.clientId) : null;
                return (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => router.push(`/purchase-orders/${po.id}`)}>
                    <TableCell className="font-bold">{po.id}</TableCell>
                    <TableCell>{client?.name || '...'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{contract?.publicId || '...'}</TableCell>
                    <TableCell>{po.amount.toLocaleString()} {po.currency}</TableCell>
                    <TableCell><Badge>{t(`Status.${po.status}`)}</Badge></TableCell>
                    <TableCell>{format(po.emissionDate, 'P')}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t('PO.noPos')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
