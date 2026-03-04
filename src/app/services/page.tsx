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
import type { Service, PurchaseOrder, Contract, Client } from '@/lib/types';
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
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ServiceImporter } from '@/components/services/service-importer';
import { useRouter } from 'next/navigation';
import { bulkUpdateServices, deleteService, updateService } from '@/lib/firestore/services';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SERVICES_PER_PAGE = 10;

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
};

type BulkMode = 'price' | 'plan' | 'po' | null;

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

  // Safety cleanup for Radix Dialog body lock
  useEffect(() => {
    if (bulkMode === null) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [bulkMode]);

  // Data fetching
  const servicesQuery = useMemo(() => 
    user ? query(collection(firestore, 'services'), where('createdBy', '==', user.uid)) : null, 
  [user, firestore]);
  const { data: services, loading: servicesLoading } = useCollection<Service>(servicesQuery);

  const posQuery = useMemo(() => 
    user ? query(collection(firestore, 'purchaseOrders'), where('createdBy', '==', user.uid)) : null, 
  [user, firestore]);
  const { data: pos } = useCollection<PurchaseOrder>(posQuery);

  const contractsQuery = useMemo(() => 
    user ? query(collection(firestore, 'contracts'), where('createdBy', '==', user.uid)) : null, 
  [user, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const clientsQuery = useMemo(() => 
    user ? query(collection(firestore, 'clients'), where('createdBy', '==', user.uid)) : null, 
  [user, firestore]);
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
    if (!selectedIds.length || 
        (bulkMode === 'price' && !bulkFee) || 
        (bulkMode === 'plan' && !bulkPlan) ||
        (bulkMode === 'po' && !bulkPoId)) return;
        
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
      const idsToUpdate = [...selectedIds];
      await bulkUpdateServices(firestore, idsToUpdate, updates);
      
      // 1. CERRAR EL MODAL PRIMERO para que Radix procese el desmontaje
      setBulkMode(null);
      setIsBulkUpdating(false);

      // 2. Esperar a que la animación de cierre termine antes de limpiar la tabla
      setTimeout(() => {
        setSelectedIds([]);
        setBulkFee('');
        setBulkPlan('');
        setBulkPoId('');
        document.body.style.pointerEvents = 'auto'; // Triple chequeo de seguridad
        
        toast({
          variant: 'success',
          title: t('Actions.bulkUpdateSuccess'),
          description: `${idsToUpdate.length} servicios actualizados correctamente.`,
        });
      }, 300);

    } catch (error: any) {
      setIsBulkUpdating(false);
      toast({
        variant: 'destructive',
        title: t('Actions.bulkUpdateError'),
        description: error.message,
      });
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

  const isLoading = userLoading || servicesLoading;

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  const sortedClients = [...(clients || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Services.title')}>
        <Button variant="outline" onClick={() => setImporterOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('Services.import')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col md:flex-row items-center gap-4 w-full">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                placeholder="Buscar por Nickname o Línea..." 
                className="pl-10 bg-white shadow-sm border-muted-foreground/20 focus-visible:ring-destructive"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  setSelectedIds([]);
                }}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); setSelectedIds([]); }}>
                <SelectTrigger className="w-full md:w-[250px] bg-white shadow-sm border-muted-foreground/20">
                  <SelectValue placeholder={t('Forms.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('Table.all')} {t('Sidebar.clients')}</SelectItem>
                  {sortedClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-primary text-primary animate-in fade-in zoom-in-95 shrink-0">
                  {t('Actions.bulkActions')} ({selectedIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('Actions.title')}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setBulkMode('price'); }} className="cursor-pointer">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>{t('Actions.bulkUpdatePrice')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setBulkMode('plan'); }} className="cursor-pointer">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <span>{t('Actions.bulkUpdatePlan')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setBulkMode('po'); }} className="cursor-pointer">
                  <Link2 className="mr-2 h-4 w-4" />
                  <span>{t('Actions.bulkUpdatePo')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="rounded-md border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-destructive hover:bg-destructive">
                <TableHead className="w-[50px] bg-destructive">
                  <Checkbox 
                    checked={selectedIds.length === paginatedServices.length && paginatedServices.length > 0}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-destructive"
                  />
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('serviceNickname')} className="flex items-center w-full h-full text-left font-bold">
                    {t('Forms.serviceNickname')} {getSortIcon('serviceNickname')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('monthlyFee')} className="flex items-center w-full h-full text-left font-bold">
                    {t('Forms.monthlyFee')} {getSortIcon('monthlyFee')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('servicePlan')} className="flex items-center w-full h-full text-left font-bold">
                    {t('Forms.servicePlan')} {getSortIcon('servicePlan')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('client')} className="flex items-center w-full h-full text-left font-bold">
                    {t('Pages.clients')} {getSortIcon('client')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground">
                  <button onClick={() => handleSort('poId')} className="flex items-center w-full h-full text-left font-bold">
                    {t('Forms.poNumber')} {getSortIcon('poId')}
                  </button>
                </TableHead>
                <TableHead className="text-destructive-foreground text-right">{t('Table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedServices.length > 0 ? paginatedServices.map((s) => {
                const po = poMap.get(s.poId);
                const contract = po ? contractMap.get(po.contractId) : null;
                const client = contract ? clientMap.get(contract.clientId) : null;

                return (
                  <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(s.id)}
                        onCheckedChange={(checked) => toggleSelect(s.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => router.push(`/services/${s.id}`)}
                        className="font-bold text-primary hover:underline text-left flex items-center gap-2"
                      >
                        <Zap className="h-3 w-3 text-yellow-500" />
                        {s.serviceNickname}
                      </button>
                      <p className="text-[10px] text-muted-foreground font-mono ml-5">{s.serviceLineNumber}</p>
                    </TableCell>
                    <TableCell>
                      <InlineFeeEdit service={s} onUpdate={handleInlineUpdate} />
                    </TableCell>
                    <TableCell className="text-xs">{s.servicePlan}</TableCell>
                    <TableCell>
                      {client ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{client.name}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-bold text-destructive">
                          {po?.poNumber || '...'}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">({s.poId.substring(0, 5)}...)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('Actions.title')}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/services/${s.id}`)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            {t('Services.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-destructive cursor-pointer">
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
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                    {t('Services.noServices')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
                onClick={() => {
                  setCurrentPage(p => p - 1);
                  setSelectedIds([]);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('Table.previous')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(p => p + 1);
                  setSelectedIds([]);
                }}
              >
                {t('Table.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <Dialog 
        open={bulkMode !== null} 
        onOpenChange={(open) => {
          if (!isBulkUpdating && !open) {
            setBulkMode(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => isBulkUpdating && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {bulkMode === 'price' && t('Actions.bulkUpdatePrice')}
              {bulkMode === 'plan' && t('Actions.bulkUpdatePlan')}
              {bulkMode === 'po' && t('Actions.bulkUpdatePo')}
            </DialogTitle>
            <DialogDescription>
              {t('Services.bulkUpdateServicesDesc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {bulkMode === 'plan' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="plan" className="text-right text-sm font-medium">
                  {t('Forms.servicePlan')}
                </label>
                <Input
                  id="plan"
                  className="col-span-3"
                  value={bulkPlan}
                  onChange={(e) => setBulkPlan(e.target.value)}
                  placeholder={t('Forms.servicePlan')}
                  disabled={isBulkUpdating}
                />
              </div>
            )}

            {bulkMode === 'price' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="currency" className="text-right text-sm font-medium">
                    {t('Forms.currency')}
                  </label>
                  <div className="col-span-3">
                    <Select value={bulkCurrency} onValueChange={(v: any) => setBulkCurrency(v)} disabled={isBulkUpdating}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="fee" className="text-right text-sm font-medium">
                    {t('Forms.monthlyFee')}
                  </label>
                  <Input
                    id="fee"
                    type="number"
                    step="0.01"
                    className="col-span-3"
                    value={bulkFee}
                    onChange={(e) => setBulkFee(e.target.value)}
                    placeholder="0.00"
                    disabled={isBulkUpdating}
                  />
                </div>
              </>
            )}

            {bulkMode === 'po' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="po" className="text-right text-sm font-medium">
                  {t('Forms.poNumber')}
                </label>
                <div className="col-span-3">
                  <Select value={bulkPoId} onValueChange={setBulkPoId} disabled={isBulkUpdating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione PO de destino..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {pos?.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(po => {
                        const contract = contractMap.get(po.contractId);
                        const client = contract ? clientMap.get(contract.clientId) : null;
                        return (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poNumber} - {client?.name || '...'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMode(null)} disabled={isBulkUpdating}>
              {t('Auth.cancelLabel')}
            </Button>
            <Button onClick={handleBulkUpdate} disabled={isBulkUpdating || (bulkMode === 'price' && !bulkFee) || (bulkMode === 'plan' && !bulkPlan) || (bulkMode === 'po' && !bulkPoId)}>
              {isBulkUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
              {t('Forms.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ServiceImporter 
        isOpen={isImporterOpen} 
        onOpenChange={setImporterOpen} 
        pos={pos || []} 
      />
    </div>
  );
}
