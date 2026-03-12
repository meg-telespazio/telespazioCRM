
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Shield, User as UserIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function UsersManagementPage() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const router = useRouter();

  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, loading } = useCollection<UserProfile>(usersQuery);

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Settings.users')}>
        <div className="flex bg-muted rounded-lg p-1">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/settings/users">{t('Settings.users')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/system">{t('Settings.system')}</Link>
          </Button>
        </div>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-destructive hover:bg-destructive">
                <TableHead className="text-white font-bold text-[10px] uppercase">USUARIO</TableHead>
                <TableHead className="text-white font-bold text-[10px] uppercase">EMAIL</TableHead>
                <TableHead className="text-white font-bold text-[10px] uppercase text-center">ROL</TableHead>
                <TableHead className="text-white font-bold text-[10px] uppercase">GERENCIA</TableHead>
                <TableHead className="text-white font-bold text-[10px] uppercase text-center">ESTADO</TableHead>
                <TableHead className="text-white font-bold text-[10px] uppercase text-right px-4">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.sort((a,b) => a.displayName.localeCompare(b.displayName)).map((user) => (
                <TableRow key={user.uid} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-primary">
                        <UserIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-[11px] text-slate-700">{user.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500">{user.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary">
                      {t(`Roles.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-600 font-medium">
                    {t(`Management.${user.management?.replace(' ', '')}`)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-[9px] h-5">
                      {t(`Status.${user.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-4">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/settings/users/${user.uid}`)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
