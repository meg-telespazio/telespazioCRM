
'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contract, PurchaseOrder, Service, Equipment } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { ServiceImporter } from '@/components/services/service-importer';

const SERVICES_PER_PAGE = 10;

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

  const totalPages = Math.ceil(services.length / SERVICES_PER_PAGE);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * SERVICES_PER_PAGE;
    return services.slice(start, start + SERVICES_PER_PAGE);
  }, [services, currentPage]);

  if (services.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground italic border rounded-md bg-background">
        {t('Services.noServices')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">{t('Forms.serviceNickname')}</TableHead>
              <TableHead>{t('Forms.servicePlan')}</TableHead>
              <TableHead>{t('Forms.monthlyFee')}</TableHead>
              <TableHead>{t('Forms.userTerminal')}</TableHead>
              <TableHead>{t('Forms.isTelespazioOwned')}</TableHead>
              <TableHead className="text-right">{t('Table.actions')}</TableHead>
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
                        className="font-bold text-primary hover:underline text-left"
                      >
                        {service.serviceNickname}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{service.serviceLineNumber}</p>
                  </TableCell>
                  <TableCell className="text-xs">{service.servicePlan}</TableCell>
                  <TableCell className="text-xs font-semibold">
                    {service.monthlyFee ? `${service.currency || 'USD'} ${service.monthlyFee.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    {equip ? (
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{equip.userTerminal}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{equip.physicalStatus}</Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No linked equipment</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.isTelespazioOwned !== false ? (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Telespazio
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <User className="h-3 w-3" />
                        {t('Dashboard.recentOpportunities.clientHeader')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onViewEquipment(service.equipmentId)}>
                      {t('Equipment.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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

export default function ClientServicesPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [isImporterOpen, setImporterOpen] = useState(false);
  const [targetPoId, setTargetPoId] = useState<string | null>(null);

  // Data fetching
  const clientDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, user]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const contractsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'contracts'), where('clientId', '==', clientId));
  }, [firestore, clientId, user]);
  const { data: contracts, loading: contractsLoading } = useCollection<Contract>(contractsQuery);

  const posQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'purchaseOrders'), where('createdBy', '==', user.uid));
  }, [firestore, user]);
  const { data: allPos, loading: posLoading } = useCollection<PurchaseOrder>(posQuery);

  const servicesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'services'), where('createdBy', '==', user.uid));
  }, [firestore, user]);
  const { data: allServices, loading: servicesLoading } = useCollection<Service>(servicesQuery);

  const equipQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'equipment'), where('createdBy', '==', user.uid));
  }, [firestore, user]);
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
      <AppHeader title={`${t('Services.title')} - ${client.name}`}>
        <Button variant="outline" onClick={() => router.push(`/clients/${clientId}/summary`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Actions.back')}
        </Button>
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
                                  <span className="font-bold">PO: {po.id}</span>
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
        defaultPoId={targetPoId || undefined}
      />
    </div>
  );
}
