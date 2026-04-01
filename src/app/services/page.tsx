
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Building,
  ShoppingCart,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  LayoutGrid,
  DollarSign,
  Link2,
} from 'lucide-react';
import type { Service, PurchaseOrder, Contract, Client, ServiceStatus } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServiceImporter } from '@/components/services/service-importer';
import { useRouter, redirect } from 'next/navigation';
import { bulkUpdateServices, deleteService, updateService } from '@/lib/firestore/services';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SERVICES_PER_PAGE = 10;

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
};

type BulkMode = 'price' | 'plan' | 'po' | null;

const statusClasses: Record<ServiceStatus, string> = {
  active: 'bg-green-100 text-green-700 border-none font-bold text-[9px]',
  paused: 'bg-amber-100 text-amber-700 border-none font-bold text-[9px]',
  canceled: 'bg-slate-100 text-slate-700 border-none font-bold text-[9px]',
};

function InlineFeeEdit({ 
  service, 
  onUpdate 
}: { 
  service: Service, 
  onUpdate: (id: string, fee: number) => Promise<void> 
}) {
  const [val, setVal] = useState(service.monthlyFee?.toString() || '0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVal(service.monthlyFee?.toString() || '0');
  }, [service.monthlyFee]);

  const handleBlur = async () => {
    const numericFee = parseFloat(val);
    if (isNaN(numericFee) || numericFee === service.monthlyFee) return;
    
    setIsSaving(true);
    try {
      await onUpdate(service.id, numericFee);
    } catch (e) {
      setVal(service.monthlyFee?.toString() || '0');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-[10px] uppercase font-bold w-8">{service.currency || 'USD'}</span>
      <div className="relative flex items-center">
        <Input
          type="number"
          step="0.01"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          className={cn(
            "h-7 w-24 text-xs px-2 font-semibold bg-transparent border-transparent hover:border-input focus:border-primary transition-all text-right",
            isSaving && "opacity-50 pointer-events-none"
          )}
        />
        {isSaving && <Loader2 className="absolute -right-5 h-3 w-3 animate-spin text-primary" />}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serviceNickname', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Bulk state
  const [bulkPlan, setBulkPlan] = useState<string>('');
  const [bulkFee, setBulkFee] = useState<string>('');
  const [bulkCurrency, setBulkCurrency] = useState<'USD' | 'EUR' | 'ARS'>('USD');
  const [bulkPoId, setBulkPoId] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
    if (user?.role === 'ingeniero') redirect('/dashboard');
  }, [user, userLoading]);

  // Data fetching
  const servicesQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'services');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const posQuery = useMemo(() => {
    if (!user || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'purchaseOrders');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const contractsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contracts');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: services, loading: servicesLoading } = useCollection<Service>(servicesQuery);
  const { data: pos } = useCollection<PurchaseOrder>(posQuery);
  const { data: contracts } = useCollection<Contract>(contractsQuery);
  const { data: clients } = useCollection<Client>(clientsQuery);

  const poMap = useMemo(() => new Map(pos?.map(p => [p.id, p])), [pos]);
  const contractMap = useMemo(() => new Map(contracts?.map(c => [c.id, c])), [contracts]);
  const clientMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);

  const processedServices = useMemo(() => {
    if (!services) return [];
    
    let filtered = services.filter(s => {
      const nickname = s.serviceNickname || '';
      const line = s.serviceLineNumber || '';
      const matchesSearch = nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            line.toLowerCase().includes(searchQuery.toLowerCase());
      
      const po = poMap.get(s.poId);
      const contract = po ? contractMap.get(po.contractId) : null;
      const matchesClient = clientFilter === 'all' || contract?.clientId === clientFilter;
      
      return matchesSearch && matchesClient;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.key === 'client') {
          const poA = poMap.get(a.poId);
          const contractA = poA ? contractMap.get(poA.contractId) : null;
          valA = clientMap.get(contractA?.clientId || '')?.name || '';

          const poB = b.poId ? poMap.get(b.poId) : null;
          const contractB = poB ? contractMap.get(poB.contractId) : null;
          valB = clientMap.get(contractB?.clientId || '')?.name || '';
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
  }, [services, searchQuery, clientFilter, sortConfig, poMap, contractMap, clientMap]);

  const totalPages = Math.ceil(processedServices.length / SERVICES_PER_PAGE);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * SERVICES_PER_PAGE;
    return processedServices.slice(start, start + SERVICES_PER_PAGE);
  }, [processedServices, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedServices.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedIds.length) return;
    setIsBulkUpdating(true);
    
    const updates: Partial<Service> = {};
    if (bulkMode === 'price' && bulkFee) {
      updates.monthlyFee = parseFloat(bulkFee);
      updates.currency = bulkCurrency;
    }
    if (bulkMode === 'plan' && bulkPlan) {
      updates.servicePlan = bulkPlan;
    }
    if (bulkMode === 'po' && bulkPoId) {
      updates.poId = bulkPoId;
    }
    
    try {
      await bulkUpdateServices(firestore, selectedIds, updates);
      setBulkMode(null);
      setSelectedIds([]);
      toast({ variant: 'success', title: t('Actions.bulkUpdateSuccess') });
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('Actions.bulkUpdateError'), description: error.message });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleInlineUpdate = async (id: string, monthlyFee: number) => {
    try {
      await updateService(firestore, id, { monthlyFee });
      toast({ variant: 'success', title: 'Precio actualizado' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al actualizar', description: error.message });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Actions.confirmDelete'))) return;
    try {
      await deleteService(firestore, id);
      toast({ variant: 'success', title: 'Servicio eliminado correctamente.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: e.message });
    }
  }

  if (userLoading || (servicesLoading && servicesQuery !== null)) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Services.title')}>
        <Button variant="outline" onClick={() => setImporterOpen(true)} disabled={user?.role === 'ingeniero'}>
          <Upload className="mr-2 h-4 w-4" />
          {t('Services.import')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-4">
        {user?.role === 'ingeniero' ? (
          <div className="text-center py-20 text-muted-foreground">Acceso restringido para Ingeniería.</div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-1 flex-col md:flex-row items-center gap-4 w-full">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <Input 
                    placeholder="Buscar por Nickname o Línea..." 
                    className="pl-10 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full md:w-[250px] bg-white">
                      <SelectValue placeholder={t('Forms.selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('Table.all')} {t('Sidebar.clients')}</SelectItem>
                      {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedIds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-primary text-primary">
                      {t('Actions.bulkActions')} ({selectedIds.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setBulkMode('price')}><DollarSign className="mr-2 h-4 w-4" />{t('Actions.bulkUpdatePrice')}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setBulkMode('plan')}><LayoutGrid className="mr-2 h-4 w-4" />{t('Actions.bulkUpdatePlan')}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setBulkMode('po')}><Link2 className="mr-2 h-4 w-4" />{t('Actions.bulkUpdatePo')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive hover:bg-destructive">
                    <TableHead className="w-[50px]"><Checkbox checked={selectedIds.length === paginatedServices.length} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead className="text-white"><button onClick={() => handleSort('serviceNickname')} className="flex items-center">{t('Forms.serviceNickname')} {getSortIcon('serviceNickname')}</button></TableHead>
                    <TableHead className="text-white"><button onClick={() => handleSort('monthlyFee')} className="flex items-center">{t('Forms.monthlyFee')} {getSortIcon('monthlyFee')}</button></TableHead>
                    <TableHead className="text-white"><button onClick={() => handleSort('servicePlan')} className="flex items-center">{t('Forms.servicePlan')} {getSortIcon('servicePlan')}</button></TableHead>
                    <TableHead className="text-white"><button onClick={() => handleSort('client')} className="flex items-center">{t('Pages.clients')} {getSortIcon('client')}</button></TableHead>
                    <TableHead className="text-white">Estado</TableHead>
                    <TableHead className="text-right text-white px-4">{t('Table.actions.title')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedServices.map((s) => {
                    const po = poMap.get(s.poId);
                    const contract = po ? contractMap.get(po.contractId) : null;
                    const client = contract ? clientMap.get(contract.clientId) : null;

                    return (
                      <TableRow key={s.id}>
                        <TableCell><Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={(checked) => toggleSelect(s.id, !!checked)} /></TableCell>
                        <TableCell>
                          <button onClick={() => router.push(`/services/${s.id}`)} className="font-bold text-primary hover:underline flex items-center gap-2">
                            <Zap className="h-3 w-3 text-yellow-500" /> {s.serviceNickname}
                          </button>
                          <p className="text-[10px] text-muted-foreground ml-5">{s.serviceLineNumber}</p>
                        </TableCell>
                        <TableCell><InlineFeeEdit service={s} onUpdate={handleInlineUpdate} /></TableCell>
                        <TableCell className="text-xs">{s.servicePlan}</TableCell>
                        <TableCell>{client?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-full", statusClasses[s.status || 'active'])}>
                            {t(`Status.${s.status || 'active'}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/services/${s.id}`)}><Edit className="mr-2 h-4 w-4" />{t('Services.edit')}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />{t('Table.actions.delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      <Dialog open={bulkMode !== null} onOpenChange={() => setBulkMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Actions.bulkActions')}</DialogTitle><DialogDescription>{t('Services.bulkUpdateServicesDesc', { count: selectedIds.length })}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            {bulkMode === 'plan' && <Input value={bulkPlan} onChange={(e) => setBulkPlan(e.target.value)} placeholder="Nuevo Plan..." />}
            {bulkMode === 'price' && <div className="flex gap-2"><Input type="number" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)} placeholder="Nuevo Abono..." /><Select value={bulkCurrency} onValueChange={(v:any) => setBulkCurrency(v)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="ARS">ARS</SelectItem></SelectContent></Select></div>}
            {bulkMode === 'po' && <Select value={bulkPoId} onValueChange={setBulkPoId}><SelectTrigger><SelectValue placeholder="PO de destino..." /></SelectTrigger><SelectContent>{pos?.map(po => <SelectItem key={po.id} value={po.id}>{po.poNumber}</SelectItem>)}</SelectContent></Select>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBulkMode(null)}>{t('Auth.cancelLabel')}</Button><Button onClick={handleBulkUpdate} disabled={isBulkUpdating}>{isBulkUpdating && <Loader2 className="animate-spin mr-2 h-4 w-4" />}{t('Forms.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ServiceImporter isOpen={isImporterOpen} onOpenChange={setImporterOpen} pos={pos || []} />
    </div>
  );
}
