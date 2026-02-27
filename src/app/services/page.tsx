
'use client';

import { useMemo, useState } from 'react';
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
  DollarSign,
  CheckCircle2,
  Loader2,
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
} from '@/components/ui/dropdown-menu';
import { ServiceImporter } from '@/components/services/service-importer';
import { useRouter } from 'next/navigation';
import { bulkUpdateServicePrices } from '@/lib/firestore/services';
import { useToast } from '@/hooks/use-toast';

const SERVICES_PER_PAGE = 10;

export default function ServicesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [isBulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [bulkFee, setBulkFee] = useState<string>('');
  const [bulkCurrency, setBulkCurrency] = useState<'USD' | 'EUR' | 'ARS'>('USD');
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Maps for quick lookup
  const poMap = useMemo(() => new Map(pos?.map(p => [p.id, p])), [pos]);
  const contractMap = useMemo(() => new Map(contracts?.map(c => [c.id, c])), [contracts]);
  const clientMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);

  // Filtering and Pagination
  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter(s => 
      s.serviceNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serviceLineNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const totalPages = Math.ceil(filteredServices.length / SERVICES_PER_PAGE);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * SERVICES_PER_PAGE;
    return filteredServices.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredServices, currentPage]);

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
    if (!selectedIds.length || !bulkFee) return;
    setIsUpdating(true);
    try {
      await bulkUpdateServicePrices(firestore, selectedIds, parseFloat(bulkFee), bulkCurrency);
      toast({
        variant: 'success',
        title: t('Actions.bulkUpdateSuccess'),
        description: `${selectedIds.length} services updated.`,
      });
      setSelectedIds([]);
      setBulkPriceDialogOpen(false);
      setBulkFee('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Actions.bulkUpdateError'),
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isLoading = userLoading || servicesLoading;

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Services.title')}>
        <Button variant="outline" onClick={() => setImporterOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('Services.import')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input 
              placeholder="Buscar por Nickname o Service Line Number..." 
              className="pl-10 bg-white shadow-sm border-muted-foreground/20 focus-visible:ring-destructive"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                setSelectedIds([]);
              }}
            />
          </div>
          
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-primary text-primary animate-in fade-in zoom-in-95">
                  {t('Actions.bulkActions')} ({selectedIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('Actions.title')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setBulkPriceDialogOpen(true)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>{t('Actions.bulkUpdatePrices')}</span>
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
                <TableHead className="text-destructive-foreground">{t('Forms.serviceNickname')}</TableHead>
                <TableHead className="text-destructive-foreground">{t('Forms.monthlyFee')}</TableHead>
                <TableHead className="text-destructive-foreground">{t('Forms.servicePlan')}</TableHead>
                <TableHead className="text-destructive-foreground">{t('Pages.clients')}</TableHead>
                <TableHead className="text-destructive-foreground">{t('Forms.poNumber')}</TableHead>
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
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="text-muted-foreground text-[10px] uppercase">{s.currency || 'USD'}</span>
                        <span>{s.monthlyFee?.toLocaleString() || '0'}</span>
                      </div>
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
                        <span className="font-bold text-destructive">{s.poId}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
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

      <Dialog open={isBulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('Actions.bulkUpdatePrices')}</DialogTitle>
            <DialogDescription>
              Se actualizará el abono mensual para los {selectedIds.length} servicios seleccionados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="currency" className="text-right text-sm font-medium">
                {t('Forms.currency')}
              </label>
              <div className="col-span-3">
                <Select value={bulkCurrency} onValueChange={(v: any) => setBulkCurrency(v)}>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPriceDialogOpen(false)}>
              {t('Auth.cancelLabel')}
            </Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkFee || isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
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
