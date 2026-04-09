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
  ChevronLeft, 
  ChevronRight, 
  ClipboardList,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  Trash2,
  MoreVertical,
  FileText
} from 'lucide-react';
import type { ServiceOrder, UserProfile, ServiceOrderItem, Contract } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteServiceOrder } from '@/lib/firestore/service-orders';
import { SOCloseModal } from '@/components/service-orders/so-close-modal';
import { SODeleteModal } from '@/components/service-orders/so-delete-modal';

const ITEMS_PER_PAGE = 10;

const statusColors: Record<string, string> = {
  Abierta: 'bg-blue-600 text-white border-transparent',
  Asignada: 'bg-purple-600 text-white border-transparent',
  Devuelta: 'bg-amber-500 text-white border-transparent',
  Cerrada: 'bg-green-600 text-white border-transparent',
  Cancelada: 'bg-slate-500 text-white border-transparent',
};

export default function ServiceOrdersPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [selectedSoForClose, setSelectedSoForClose] = useState<ServiceOrder | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  
  const [selectedSoForDelete, setSelectedSoForDelete] = useState<ServiceOrder | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
  }, [user, userLoading]);

  // Data fetching
  const soQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'service_orders'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: serviceOrders, loading: soLoading } = useCollection<ServiceOrder>(soQuery);
  const { data: users } = useCollection<UserProfile>(collection(firestore, 'users'));
  const { data: contracts } = useCollection<Contract>(collection(firestore, 'contracts'));

  const contractMap = useMemo(() => new Map(contracts?.map(c => [c.id, c.publicId])), [contracts]);

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

  const handleDeleteAttempt = (so: ServiceOrder) => {
    setSelectedSoForDelete(so);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSoForDelete) return;
    setIsDeleting(true);
    try {
      await deleteServiceOrder(firestore, selectedSoForDelete.id);
      toast({ variant: 'success', title: 'Service Order eliminada correctamente.' });
      setIsDeleteModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: e.message });
    } finally {
      setIsDeleting(false);
      setSelectedSoForDelete(null);
    }
  };

  const handleCloseAttempt = async (so: ServiceOrder) => {
    setIsValidating(so.id);
    try {
      const itemsRef = collection(firestore, 'service_orders', so.id, 'items');
      const itemsSnap = await getDocs(itemsRef);
      const items = itemsSnap.docs.map(d => d.data() as ServiceOrderItem);

      if (items.length === 0) {
        toast({ variant: 'destructive', title: t('SO.noItems') });
        return;
      }

      const allClosed = items.every(i => i.isClosed);
      if (!allClosed) {
        toast({ variant: 'destructive', title: t('SO.itemsIncomplete') });
        return;
      }

      setSelectedSoForClose(so);
      setIsCloseModalOpen(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error de validación', description: e.message });
    } finally {
      setIsValidating(null);
    }
  };

  if (userLoading || soLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  const isAdmin = user?.role === 'admin';

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
                <TableHead className="text-white font-bold">CONTRATO</TableHead>
                <TableHead className="text-white font-bold">ESTADO</TableHead>
                <TableHead className="text-white font-bold">PM ASIGNADO</TableHead>
                <TableHead className="text-white font-bold">F. CREACIÓN</TableHead>
                <TableHead className="text-white font-bold text-right px-4">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? paginatedOrders.map((so) => {
                const canClose = so.status !== 'Cerrada' && (isAdmin || user?.uid === so.pmAssignedId);
                const contractPublicId = contractMap.get(so.contractId) || '-';
                return (
                  <TableRow 
                    key={so.id} 
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell onClick={() => router.push(`/service-orders/${so.id}`)} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-bold text-primary">{so.publicId}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/service-orders/${so.id}`)} className="cursor-pointer">
                      <div className="font-bold text-slate-700">{so.clientName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{so.cuit}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-[11px] font-bold">{contractPublicId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-full font-bold text-[9px] uppercase", statusColors[so.status])}>
                        {t(`Status.${so.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {so.pmAssignedId ? (
                        <div className="flex items-center gap-2 text-xs">
                          <UserIcon className="h-3.5 w-3.5" />
                          {userMap.get(so.pmAssignedId)?.displayName || '...'}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No asignado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500">
                      {format(so.createdAt, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex justify-end gap-2">
                        {canClose && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] uppercase font-bold border-green-200 text-green-700 hover:bg-green-50"
                            onClick={() => handleCloseAttempt(so)}
                            disabled={isValidating === so.id}
                          >
                            {isValidating === so.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {t('SO.close')}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/service-orders/${so.id}`)}>
                              {t('Activity.view')}
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAttempt(so)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('Table.actions.delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
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
                <ChevronLeft className="h-4 w-4 mr-1" /> {t('Table.previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                {t('Table.next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <SOCloseModal 
        isOpen={isCloseModalOpen} 
        onOpenChange={setIsCloseModalOpen} 
        so={selectedSoForClose} 
      />

      <SODeleteModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        so={selectedSoForDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
