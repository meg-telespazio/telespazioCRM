'use client';

import { useMemo, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contract, PurchaseOrder, Service, Equipment } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Upload,
  Zap,
  ShoppingCart,
  FileText,
  HardDrive,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet
} from 'lucide-react';
import { ServiceImporter } from '@/components/services/service-importer';
import { cn } from '@/lib/utils';

const SERVICES_PER_PAGE = 10;

type SortConfig = {
  key: keyof Service | 'userTerminal';
  direction: 'asc' | 'desc' | null;
};

function PaginatedServiceTable({ 
  services, 
  equipment, 
  onViewEquipment 
}: { 
  services: Service[], 
  equipment: Equipment[], 
  onViewEquipment: (id: string) => void 
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serviceNickname', direction: 'asc' });

  // Filtering and Sorting logic
  const filteredAndSortedServices = useMemo(() => {
    let result = [...services];

    // Filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.serviceNickname?.toLowerCase().includes(q) || 
        s.serviceLineNumber?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'userTerminal') {
          valA = equipment.find(e => e.id === a.equipmentId)?.userTerminal || '';
          valB = equipment.find(e => e.id === b.equipmentId)?.userTerminal || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [services, searchTerm, sortConfig, equipment]);

  const totalPages = Math.ceil(filteredAndSortedServices.length / SERVICES_PER_PAGE);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * SERVICES_PER_PAGE;
    return filteredAndSortedServices.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredAndSortedServices, currentPage]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const exportData = filteredAndSortedServices.map(s => {
      const equip = equipment.find(e => e.id === s.equipmentId);
      return {
        'Nickname': s.serviceNickname,
        'Línea': s.serviceLineNumber,
        'Plan': s.servicePlan,
        'Abono': s.monthlyFee,
        'Moneda': s.currency,
        'Terminal (UUID)': s.equipmentId,
        'Terminal (Serial)': equip?.userTerminal || '',
        'Propiedad': s.isTelespazioOwned ? 'Telespazio' : 'Cliente',
        'Estado': s.status
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    XLSX.writeFile(wb, `servicios_${new Date().getTime()}.xlsx`);
  };

  if (services.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground italic border rounded-md bg-background">
        {t('Services.noServices')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nickname o línea..." 
            className="pl-9 h-9 text-xs" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto h-9 gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Listado
        </Button>
      </div>

      <div className="rounded-md border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">
                <button onClick={() => handleSort('serviceNickname')} className="flex items-center hover:text-primary transition-colors font-bold uppercase text-[10px]">
                  {t('Forms.serviceNickname')} {getSortIcon('serviceNickname')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('servicePlan')} className="flex items-center hover:text-primary transition-colors font-bold uppercase text-[10px]">
                  {t('Forms.servicePlan')} {getSortIcon('servicePlan')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('monthlyFee')} className="flex items-center hover:text-primary transition-colors font-bold uppercase text-[10px]">
                  {t('Forms.monthlyFee')} {getSortIcon('monthlyFee')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('userTerminal')} className="flex items-center hover:text-primary transition-colors font-bold uppercase text-[10px]">
                  {t('Forms.userTerminal')} {getSortIcon('userTerminal')}
                </button>
              </TableHead>
              <TableHead className="font-bold uppercase text-[10px]">{t('Forms.isTelespazioOwned')}</TableHead>
              <TableHead className="text-right font-bold uppercase text-[10px] pr-4">{t('Actions.title')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedServices.map(service => {
              const equip = equipment.find(e => e.id === service.equipmentId);
              return (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <button 
                        onClick={() => router.push(`/services/${service.id}`)}
                        className="font-bold text-primary hover:underline text-left text-[11px]"
                      >
                        {service.serviceNickname}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{service.serviceLineNumber}</p>
                  </TableCell>
                  <TableCell className="text-[11px] font-medium">{service.servicePlan}</TableCell>
                  <TableCell className="text-[11px] font-black text-slate-800">
                    {service.monthlyFee ? `${service.currency || 'USD'} ${service.monthlyFee.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    {equip ? (
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-mono">{equip.userTerminal}</span>
                        <Badge variant="outline" className="text-[8px] h-4 py-0 uppercase font-bold">{equip.physicalStatus}</Badge>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Sin equipo vinculado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.isTelespazioOwned !== false ? (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1 px-2 py-0">
                        <ShieldCheck className="h-3 w-3" />
                        Telespazio
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0 border-slate-200 text-slate-500">
                        <User className="h-3 w-3" />
                        {t('Dashboard.recentOpportunities.clientHeader')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => router.push(`/services/${service.id}`)}>
                      {t('Activity.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedServices.length === 0 && searchTerm && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                  No se encontraron servicios que coincidan con "{searchTerm}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">
            {t('Table.pagination.pageInfo', { page: currentPage, totalPages })}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientServicesContent() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [isImporterOpen, setImporterOpen] = useState(false);
  const [targetPoId, setTargetPoId] = useState<string | null>(null);

  // Data fetching - Stabilized with management area awareness
  const clientDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, user]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const contractsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'contracts'), where('clientId', '==', clientId));
  }, [firestore, clientId, user]);
  const { data: contracts, loading: contractsLoading } = useCollection<Contract>(contractsQuery);

  const posQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'purchaseOrders');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allPos, loading: posLoading } = useCollection<PurchaseOrder>(posQuery);

  const servicesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'services');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allServices, loading: servicesLoading } = useCollection<Service>(servicesQuery);

  const equipQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'equipment');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allEquip } = useCollection<Equipment>(equipQuery);

  const isLoading = userLoading || clientLoading || contractsLoading || posLoading || servicesLoading;

  const handleOpenImporter = (poId: string) => {
    setTargetPoId(poId);
    setImporterOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="link" onClick={() => router.push('/clients')}>{t('Actions.backToClientList')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/clients" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.clients')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link href={`/clients/${client.id}/summary`} className="text-muted-foreground hover:text-primary transition-colors">{client.name}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{t('Pages.services')}</span>
        </div>
      }>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => router.push(`/services/new?clientId=${clientId}`)} className="border-primary text-primary">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Carga Manual</span>
            </Button>
            <Button variant="outline" onClick={() => router.push(`/clients/${clientId}/summary`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('Actions.back')}
            </Button>
        </div>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {contracts && contracts.length > 0 ? (
          <Accordion type="multiple" defaultValue={contracts.map(c => c.id)} className="space-y-4">
            {contracts.map(contract => {
              const contractPos = allPos?.filter(po => po.contractId === contract.id) || [];
              
              return (
                <AccordionItem key={contract.id} value={contract.id} className="border rounded-lg bg-card px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {contract.publicId} 
                          <Badge variant="outline" className="text-[10px]">{contract.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t(`ContractStatuses.${contract.status}`)} • {contract.amount.toLocaleString()} {contract.currency}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2 space-y-6">
                    {contractPos.length > 0 ? (
                      <div className="space-y-4 ml-4 border-l-2 pl-6">
                        {contractPos.map(po => {
                          const poServices = allServices?.filter(s => s.poId === po.id) || [];
                          
                          return (
                            <div key={po.id} className="space-y-3">
                              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-bold">PO: {po.poNumber}</span>
                                  <Badge variant="secondary" className="text-[10px]">{t(`Status.${po.status}`)}</Badge>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleOpenImporter(po.id)}>
                                  <Upload className="h-3 w-3 mr-2" />
                                  {t('Services.import')}
                                </Button>
                              </div>

                              <PaginatedServiceTable 
                                services={poServices} 
                                equipment={allEquip || []}
                                onViewEquipment={(id) => router.push(`/equipment/${id}`)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg ml-4">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">{t('PO.noPos')}</p>
                        <Button variant="link" size="sm" onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}>
                          {t('Actions.addPO')}
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <Card className="border-dashed flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>{t('Contracts.noContracts')}</CardTitle>
            <CardDescription className="mt-2 mb-6">Create a contract to start managing services.</CardDescription>
            <Button onClick={() => router.push(`/contracts/new?clientId=${clientId}`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('Pages.addContract')}
            </Button>
          </Card>
        )}
      </main>

      <ServiceImporter 
        isOpen={isImporterOpen} 
        onOpenChange={setImporterOpen} 
        pos={allPos || []}
        contracts={contracts || []}
        clients={client ? [client] : []}
        defaultPoId={targetPoId || undefined}
      />
    </div>
  );
}

export default function ClientServicesPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <ClientServicesContent />
    </Suspense>
  );
}
