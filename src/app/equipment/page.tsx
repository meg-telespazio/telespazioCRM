'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  HardDrive, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Building,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import type { Equipment, Service, PurchaseOrder, Contract, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteEquipment } from '@/lib/firestore/equipment';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

export default function EquipmentPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'userTerminal', 
    direction: 'asc' 
  });

  // Data fetching
  const eqQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'equipment');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  
  const { data: equipment, loading: eqLoading } = useCollection<Equipment>(eqQuery);

  const servicesQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'services');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: services } = useCollection<Service>(servicesQuery);

  const posQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'purchaseOrders');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: pos } = useCollection<PurchaseOrder>(posQuery);

  const contractsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contracts');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: clients } = useCollection<Client>(clientsQuery);

  // Maps for context lookup
  const serviceMap = useMemo(() => new Map(services?.map(s => [s.id, s])), [services]);
  const poMap = useMemo(() => new Map(pos?.map(p => [p.id, p])), [pos]);
  const contractMap = useMemo(() => new Map(contracts?.map(c => [c.id, c])), [contracts]);
  const clientMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);

  // Processing
  const processedEquipment = useMemo(() => {
    if (!equipment) return [];

    let filtered = equipment.filter(eq => {
      const matchesSearch = eq.userTerminal.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            eq.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const service = eq.currentServiceId ? serviceMap.get(eq.currentServiceId) : null;
      const po = service ? poMap.get(service.poId) : null;
      const contract = po ? contractMap.get(po.contractId) : null;
      const matchesClient = clientFilter === 'all' || contract?.clientId === clientFilter;

      return matchesSearch && matchesClient;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.key === 'client') {
          const sA = a.currentServiceId ? serviceMap.get(a.currentServiceId) : null;
          const pA = sA ? poMap.get(sA.poId) : null;
          const cA = pA ? contractMap.get(pA.contractId) : null;
          valA = clientMap.get(cA?.clientId || '')?.name || '';

          const sB = b.currentServiceId ? serviceMap.get(b.currentServiceId) : null;
          const pB = sB ? poMap.get(sB.poId) : null;
          const cB = pB ? contractMap.get(pB.contractId) : null;
          valB = clientMap.get(cB?.clientId || '')?.name || '';
        } else {
          valA = (a as any)[sortConfig.key] || '';
          valB = (b as any)[sortConfig.key] || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [equipment, searchQuery, clientFilter, sortConfig, serviceMap, poMap, contractMap, clientMap]);

  const totalPages = Math.ceil(processedEquipment.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedEquipment.slice(start, start + ITEMS_PER_PAGE);
  }, [processedEquipment, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Actions.confirmDelete'))) return;
    try {
      await deleteEquipment(firestore, id);
      toast({ variant: 'success', title: 'Equipo eliminado del inventario.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  if (userLoading || eqLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Equipment.title')}>
        <Button size="sm" onClick={() => router.push('/equipment/new')} disabled={user?.role === 'ingeniero'}>
          <PlusCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('Equipment.add')}</span>
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input 
              placeholder="Buscar por Nickname o ID..." 
              className="pl-10 bg-white shadow-sm border-muted-foreground/20 focus-visible:ring-destructive"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[250px] bg-white shadow-sm border-muted-foreground/20">
                <SelectValue placeholder={t('Forms.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Table.all')} {t('Sidebar.clients')}</SelectItem>
                {[...(clients || [])].sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-destructive hover:bg-destructive">
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('userTerminal')} className="flex items-center font-bold">
                    {t('Forms.userTerminal')} {getSortIcon('userTerminal')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('type')} className="flex items-center font-bold">
                    {t('Forms.type')} {getSortIcon('type')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('physicalStatus')} className="flex items-center font-bold">
                    {t('Forms.physicalStatus')} {getSortIcon('physicalStatus')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('client')} className="flex items-center font-bold">
                    {t('Pages.clients')} {getSortIcon('client')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('id')} className="flex items-center font-bold">
                    {t('Forms.userTerminalId')} {getSortIcon('id')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground text-right">{t('Table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? paginatedItems.map((eq) => {
                const service = eq.currentServiceId ? serviceMap.get(eq.currentServiceId) : null;
                const po = service ? poMap.get(service.poId) : null;
                const contract = po ? contractMap.get(po.contractId) : null;
                const client = contract ? clientMap.get(contract.clientId) : null;

                return (
                  <TableRow key={eq.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <button 
                        onClick={() => router.push(`/equipment/${eq.id}`)}
                        className="font-bold text-primary hover:underline text-left flex items-center gap-2"
                      >
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        {eq.userTerminal}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">{eq.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{eq.physicalStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      {client ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{client.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">En Stock</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                      {eq.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/equipment/${eq.id}`)} className="cursor-pointer" disabled={user?.role === 'ingeniero'}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('Actions.editItem')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(eq.id)} className="text-destructive cursor-pointer" disabled={user?.role !== 'admin' && user?.role !== 'gerente'}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('Table.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    {t('Equipment.noEquipment')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">
              {t('Table.pagination.pageInfo', { page: currentPage, totalPages })}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('Table.previous')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                {t('Table.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
