
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
  ShoppingCart
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
import { ServiceImporter } from '@/components/services/service-importer';
import { useRouter } from 'next/navigation';

const SERVICES_PER_PAGE = 10;

export default function ServicesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();
  
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por Nickname o Service Line Number..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
        </div>

        {/* Table */}
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-destructive hover:bg-destructive">
                <TableHead className="text-destructive-foreground">{t('Forms.serviceNickname')}</TableHead>
                <TableHead className="text-destructive-foreground">{t('Forms.serviceLineNumber')}</TableHead>
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
                  <TableRow key={s.id}>
                    <TableCell>
                      <button 
                        onClick={() => router.push(`/services/${s.id}`)}
                        className="font-bold text-primary hover:underline text-left flex items-center gap-2"
                      >
                        <Zap className="h-3 w-3 text-yellow-500" />
                        {s.serviceNickname}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.serviceLineNumber}
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    {t('Services.noServices')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
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

      <ServiceImporter 
        isOpen={isImporterOpen} 
        onOpenChange={setImporterOpen} 
        pos={pos || []} 
      />
    </div>
  );
}
