
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, HardDrive } from 'lucide-react';
import type { Equipment } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function EquipmentPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

  const eqQuery = useMemo(() => user ? query(collection(firestore, 'equipment'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: equipment, loading: eqLoading } = useCollection<Equipment>(eqQuery);

  if (userLoading || eqLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Equipment.title')}>
        <Button onClick={() => router.push('/equipment/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Equipment.add')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Forms.userTerminal')}</TableHead>
                <TableHead>{t('Forms.type')}</TableHead>
                <TableHead>{t('Forms.physicalStatus')}</TableHead>
                <TableHead>{t('Forms.installationPlace')}</TableHead>
                <TableHead>{t('Forms.userTerminalId')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment && equipment.length > 0 ? equipment.map((eq) => (
                <TableRow key={eq.id} className="cursor-pointer" onClick={() => router.push(`/equipment/${eq.id}`)}>
                  <TableCell className="font-bold">{eq.userTerminal}</TableCell>
                  <TableCell>{eq.type}</TableCell>
                  <TableCell><Badge variant="outline">{eq.physicalStatus}</Badge></TableCell>
                  <TableCell>{eq.installationPlace || '-'}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground">{eq.id}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t('Equipment.noEquipment')}
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
