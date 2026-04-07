
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter, redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Building,
  ClipboardList,
  User as UserIcon,
  BadgeAlert,
  Loader2
} from 'lucide-react';
import type { ServiceOrder, Client, UserProfile } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const statusColors: Record<string, string> = {
  Abierta: 'bg-blue-100 text-blue-700 border-blue-200',
  Asignada: 'bg-purple-100 text-purple-700 border-purple-200',
  Devuelta: 'bg-amber-100 text-amber-700 border-amber-200',
  Cerrada: 'bg-green-100 text-green-700 border-green-200',
  Cancelada: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ServiceOrdersPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
  }, [user, userLoading]);

  // Data fetching
  const soQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'service_orders');
    
    let q = query(ref, orderBy('createdAt', 'desc'));
    
    // Security: Managers and Admins see all. EECC and Engineers see all but only edit their own.
    // The spec says they can READ all.
    return q;
  }, [user, firestore]);

  const { data: serviceOrders, loading: soLoading } = useCollection<ServiceOrder>(soQuery);
  const { data: users } = useCollection<UserProfile>(collection(firestore, 'users'));

  const filteredOrders = useMemo(() => {
    if (!serviceOrders) return [];
    return serviceOrders.filter(so => {
      const matchesSearch = so.publicId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            so.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || so.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [serviceOrders, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);

  if (userLoading || soLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Sidebar.serviceOrders')}>
        {user?.role !== 'ingeniero' && (
          <Button size="sm" onClick={() => router.push('/service-orders/new')}>
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('SO.createNew')}</span>
          </Button>
        )}
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por ID o Cliente..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-white">
              <SelectValue placeholder="Estado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              {['Abierta', 'Asignada', 'Devuelta', 'Cerrada', 'Cancelada'].map(s => (
                <SelectItem key={s} value={s}>{t(`Status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <div className="rounded-md border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-destructive hover:bg-destructive">
                <TableHead className="text-white font-bold">ID ORDEN</TableHead>
                <TableHead className="text-white font-bold">CLIENTE</TableHead>
                <TableHead className="text-white font-bold">TIPO</TableHead>
                <TableHead className="text-white font-bold">ESTADO</TableHead>
                <TableHead className="text-white font-bold">PM ASIGNADO</TableHead>
                <TableHead className="text-white font-bold text-right">F. CREACIÓN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? paginatedOrders.map((so) => (
                <TableRow 
                  key={so.id} 
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/service-orders/${so.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-bold text-primary">{so.publicId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700">{so.clientName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{so.cuit}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase">{so.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-full font-bold text-[9px] uppercase", statusColors[so.status])}>
                      {t(`Status.${so.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {so.pmAssignedId ? (
                      <div className="flex items-center gap-2 text-xs">
                        <UserIcon className="h-3 w-3" />
                        {userMap.get(so.pmAssignedId)?.displayName || '...'}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No asignado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-slate-500">
                    {format(so.createdAt, 'dd/MM/yyyy')}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    No se encontraron Service Orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
