
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contact, Opportunity, Activity, Contract, PurchaseOrder, Service, Equipment } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { 
  ArrowLeft, Building, Mail, Phone, Globe, Edit, PlusCircle, 
  MapPin, Activity as ActivityIcon, Linkedin, FileText, 
  ShoppingCart, Zap, HardDrive, LayoutGrid, ExternalLink, 
  Users, ShieldCheck, User, Paperclip, Eye, Download, Tag, 
  Flag, Briefcase, TrendingUp, AlertTriangle, AlertCircle,
  FileSpreadsheet, ChevronRight, Key, ShieldAlert
} from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { PreBillingModal } from '@/components/clients/pre-billing-modal';

export default function ClientSummaryPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreBillingOpen, setIsPreBillingOpen] = useState(false);

  // Data fetching
  const clientDocRef = useMemo(() => firestore ? doc(firestore, 'clients', clientId) : null, [firestore, clientId]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const contractsQuery = useMemo(() => {
    if (!user || !clientId) return null;
    const ref = collection(firestore, 'contracts');
    if (user.role === 'admin') return query(ref, where('clientId', '==', clientId));
    return query(ref, where('clientId', '==', clientId), where('management', '==', user.management));
  }, [user, clientId, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const opportunitiesQuery = useMemo(() => {
    if (!user || !clientId || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'opportunities');
    if (user.role === 'admin') return query(ref, where('clientId', '==', clientId));
    return query(ref, where('clientId', '==', clientId), where('management', '==', user.management));
  }, [user, clientId, firestore]);
  const { data: opportunities } = useCollection<Opportunity>(opportunitiesQuery);

  const posQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'purchaseOrders');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allPos } = useCollection<PurchaseOrder>(posQuery);

  const servicesQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'services');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allServices } = useCollection<Service>(servicesQuery);

  const equipQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'equipment');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);
  const { data: allEquip } = useCollection<Equipment>(equipQuery);

  const contactsQuery = useMemo(() => {
    if (!user || !clientId) return null;
    const ref = collection(firestore, 'contacts');
    if (user.role === 'admin') return query(ref, where('clientId', '==', clientId));
    return query(ref, where('clientId', '==', clientId), where('management', '==', user.management));
  }, [user, clientId, firestore]);
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const activitiesQuery = useMemo(() => {
    if (!user || !clientId || user.role === 'ingeniero') return null;
    const ref = collection(firestore, 'activities');
    if (user.role === 'admin') return query(ref, where('clientId', '==', clientId));
    return query(ref, where('clientId', '==', clientId), where('management', '==', user.management));
  }, [user, clientId, firestore]);
  const { data: activities } = useCollection<Activity>(activitiesQuery);

  // Calculations for MRR and Services
  const { clientServices, totalMRR } = useMemo(() => {
    if (!contracts || !allPos || !allServices) return { clientServices: [], totalMRR: 0 };
    
    const clientContractIds = new Set(contracts.map(c => c.id));
    const clientPoIds = new Set(allPos.filter(po => clientContractIds.has(po.contractId)).map(po => po.id));
    const filteredServices = allServices.filter(s => clientPoIds.has(s.poId));
    
    const mrr = filteredServices.reduce((acc, s) => acc + (s.monthlyFee || 0), 0);
    
    return { clientServices: filteredServices, totalMRR: mrr };
  }, [contracts, allPos, allServices]);

  // Budget Execution Logic
  const contractExecutionStats = useMemo(() => {
    const stats = new Map<string, { consumed: number, percentage: number }>();
    if (!contracts || !allPos) return stats;

    contracts.forEach(contract => {
      const consumed = allPos
        .filter(po => po.contractId === contract.id && po.status !== 'canceled')
        .reduce((sum, po) => sum + (po.amount || 0), 0);
      
      const percentage = contract.amount > 0 ? (consumed / contract.amount) * 100 : 0;
      stats.set(contract.id, { consumed, percentage });
    });

    return stats;
  }, [contracts, allPos]);

  // Aggregate all documents
  const allDocuments = useMemo(() => {
    const docs: any[] = [];
    contracts?.forEach(c => {
      c.attachments?.forEach(a => docs.push({ ...a, source: 'Contrato', sourceId: c.publicId }));
    });
    opportunities?.forEach(o => {
      o.attachments?.forEach(a => docs.push({ ...a, source: 'Oportunidad', sourceId: o.publicId }));
    });
    return docs.sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts, opportunities]);

  const handlePreview = (attachment: any) => {
    setPreviewFile({
      url: attachment.url,
      name: attachment.name,
      type: attachment.type || (attachment.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    });
    setIsPreviewOpen(true);
  };

  const isLoading = userLoading || clientLoading;
  const isIngeniero = user?.role === 'ingeniero';

  if (isLoading) return <div className="p-6 space-y-6"><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;
  if (!client) return <div className="p-12 text-center"><p>Client not found.</p></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/clients" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.clients')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{client.name}</span>
        </div>
      }>
        <Button variant="outline" onClick={() => router.push('/clients')}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
        
        {!isIngeniero && (
          <>
            <Button variant="outline" className="hidden sm:flex border-primary text-primary" onClick={() => setIsPreBillingOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t('Actions.generatePreBilling')}
            </Button>
            <Button onClick={() => router.push(`/clients/${clientId}`)}><Edit className="mr-2 h-4 w-4" />{t('Actions.editClient')}</Button>
          </>
        )}
      </AppHeader>
      
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Info Card */}
        <Card className="overflow-hidden shadow-md">
          <CardHeader className="flex-col sm:flex-row items-start sm:items-center gap-4 border-b bg-muted/10 pb-6">
            <Avatar className="h-20 w-20 rounded-lg border-2 border-background shadow-sm">
              <AvatarImage src={client.logoURL || undefined} />
              <AvatarFallback className="rounded-lg bg-muted"><Building className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl font-bold">{client.name}</CardTitle>
                <Badge 
                  className={cn(
                    "px-3 py-0.5 font-bold uppercase text-[10px] border-none",
                    client.status === 'active' ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-800 text-white hover:bg-slate-900"
                  )}
                >
                  {t(`Status.${client.status}`)}
                </Badge>
              </div>
              <CardDescription className="text-base flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5" />
                {client.sector} 
                {client.subsector && <span className="text-muted-foreground">• {client.subsector}</span>}
                {client.countryHQ && (
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    • 
                    <Flag className="h-3.5 w-3.5" />
                    {t(`Countries.${client.countryHQ}`)}
                  </span>
                )}
                {client.holding && (
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    • 
                    <Link href={`/holdings/${encodeURIComponent(client.holding)}`} className="text-primary hover:underline font-bold">
                      {client.holding}
                    </Link>
                  </span>
                )}
                • <span className="font-mono">{client.publicId}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
              {client.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={client.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Sitio Web
                  </a>
                </Button>
              )}
              {client.linkedinPage && (
                <Button variant="outline" size="sm" asChild>
                  <a href={client.linkedinPage} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Auth.emailLabel')}</span>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="text-primary font-medium hover:underline">{client.email}</a>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Auth.phoneLabel')}</span>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Forms.cuit')}</span>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{client.cuit}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Forms.countryHQ')}</span>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span>{client.countryHQ ? t(`Countries.${client.countryHQ}`) : '-'}</span>
                </div>
              </div>
            </div>

            {/* Portal Proveedores Display */}
            {client.supplierPortalUrl && (
              <div className="px-6 pb-6 animate-in fade-in">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('Forms.supplierPortalUrl')}</p>
                      <a href={client.supplierPortalUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
                        {client.supplierPortalUrl}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{t('Forms.supplierPortalUser')}</p>
                      <div className="flex items-center gap-1.5 font-medium text-xs">
                        <User className="h-3 w-3 text-slate-400" />
                        {client.supplierPortalUser || '-'}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{t('Forms.supplierPortalPassword')}</p>
                      <div className="flex items-center gap-1.5 font-medium text-xs">
                        <Key className="h-3 w-3 text-slate-400" />
                        {client.supplierPortalPassword ? '••••••••' : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('Sidebar.services')} Activos</p>
                  <p className="text-2xl font-bold">{clientServices.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">MRR Total</p>
                <p className="text-2xl font-bold text-primary">USD {totalMRR.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30 border-muted shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Contratos Vigentes</p>
                <p className="text-2xl font-bold">{contracts?.filter(c => c.status === 'activo' || c.status === 'renovado automatico').length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200 shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <Briefcase className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Negocios Abiertos</p>
                <p className="text-2xl font-bold text-amber-900">{opportunities?.filter(o => !['Won', 'Lost', 'Canceled', 'Suspended'].includes(o.stage)).length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-[600px]">
            <TabsTrigger value="operations">Operaciones</TabsTrigger>
            <TabsTrigger value="opportunities" disabled={isIngeniero}>Negocios</TabsTrigger>
            <TabsTrigger value="documents">Documentos ({allDocuments.length})</TabsTrigger>
            <TabsTrigger value="activities" disabled={isIngeniero}>Actividad</TabsTrigger>
          </TabsList>

          {/* Operations View */}
          <TabsContent value="operations" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
                <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" />{t('Sidebar.contracts')} & Operaciones</CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push(`/clients/${clientId}/services`)}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Ver Gestión de Servicios
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {contracts && contracts.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {contracts.map(contract => {
                      const contractPos = allPos?.filter(p => p.contractId === contract.id) || [];
                      const execution = contractExecutionStats.get(contract.id) || { consumed: 0, percentage: 0 };
                      const isOverLimit = execution.percentage > 100;
                      const isWarning = execution.percentage > 80 && !isOverLimit;

                      return (
                        <AccordionItem key={contract.id} value={contract.id} className="border-b last:border-0 px-6">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 text-left w-full">
                              <div className="flex items-center gap-4 min-w-[250px]">
                                <Badge variant="outline" className="font-mono">{contract.publicId}</Badge>
                                <span className="font-bold text-base">{contract.type}</span>
                              </div>
                              
                              <div className="flex-1 max-w-xs space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                  <span className="text-muted-foreground">Ejecución Presupuestaria</span>
                                  <span className={cn(isOverLimit ? "text-destructive" : isWarning ? "text-amber-600" : "text-primary")}>
                                    {execution.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress 
                                  value={Math.min(execution.percentage, 100)} 
                                  className={cn("h-1.5", isOverLimit ? "bg-destructive/20" : "")} 
                                />
                              </div>

                              <div className="flex items-center gap-3 ml-auto pr-4">
                                {isOverLimit && <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />}
                                {isWarning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded italic">
                                  {format(contract.startDate, 'P')} - {format(contract.endDate, 'P')}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="p-3 bg-muted/20 rounded border space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Monto Total Contrato</p>
                                <p className="text-lg font-bold">{contract.currency} {contract.amount.toLocaleString()}</p>
                              </div>
                              <div className={cn("p-3 rounded border space-y-1", isOverLimit ? "bg-destructive/5 border-destructive/20" : "bg-muted/20")}>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Monto Ejecutado (POs)</p>
                                <p className={cn("text-lg font-bold", isOverLimit ? "text-destructive" : "")}>
                                  {contract.currency} {execution.consumed.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md">
                              <span className="text-xs font-bold text-muted-foreground uppercase">{t('Sidebar.pos')}</span>
                              {!isIngeniero && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}><PlusCircle className="h-3 w-3 mr-1"/>Nueva PO</Button>
                              )}
                            </div>
                            {contractPos.length > 0 ? (
                              <div className="space-y-2">
                                {contractPos.map(po => {
                                  const poServices = allServices?.filter(s => s.poId === po.id) || [];
                                  return (
                                    <div key={po.id} className="border rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between bg-slate-50 p-3 border-b">
                                        <div className="flex items-center gap-3">
                                          <ShoppingCart className="h-4 w-4 text-primary" />
                                          <span className="font-bold text-sm">PO: {po.poNumber}</span>
                                          <Badge variant="secondary" className="text-[10px]">{po.amount.toLocaleString()} {po.currency}</Badge>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t(`Status.${po.status}`)}</span>
                                      </div>
                                      <div className="p-2 space-y-2">
                                        {poServices.length > 0 ? (
                                          <div className="grid gap-2">
                                            {poServices.map(service => {
                                              const equipment = allEquip?.find(e => e.id === service.equipmentId);
                                              return (
                                                <div key={service.id} className="flex flex-col gap-1 p-3 border rounded-lg bg-background hover:bg-slate-50 transition-colors">
                                                  <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                      <Zap className="h-4 w-4 text-yellow-500" />
                                                      <span className="font-bold text-sm">{service.serviceNickname}</span>
                                                      {service.isTelespazioOwned !== false ? (
                                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] h-4 leading-none">
                                                          Telespazio
                                                        </Badge>
                                                      ) : (
                                                        <Badge variant="outline" className="text-[9px] h-4 leading-none">
                                                          Cliente
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-xs font-bold text-primary">{service.currency} {service.monthlyFee?.toLocaleString()}</span>
                                                      <p className="text-[10px] font-mono text-muted-foreground">{service.serviceLineNumber}</p>
                                                    </div>
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">{service.servicePlan}</div>
                                                  {equipment && (
                                                    <div className="mt-2 flex items-center gap-2 text-[10px] bg-muted/50 p-2 rounded">
                                                      <HardDrive className="h-3 w-3" />
                                                      <span className="font-semibold">{equipment.userTerminal}</span>
                                                      <Badge variant="outline" className="text-[9px] h-4 leading-none bg-background">{equipment.physicalStatus}</Badge>
                                                      {equipment.latitude && <span className="text-muted-foreground">• Ubicación mapeada</span>}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground italic py-4 text-center">Sin servicios vinculados. Use el importador de servicios para cargar desde Excel.</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic py-4 text-center border-2 border-dashed rounded-lg">No hay órdenes de compra registradas para este contrato.</div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    <p>No hay contratos registrados.</p>
                    {!isIngeniero && (
                      <Button variant="link" className="mt-2" onClick={() => router.push(`/contracts/new?clientId=${clientId}`)}>Crear primer contrato</Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Negocios & Oportunidades</CardTitle>
                  <CardDescription>Pipeline de ventas relacionado a este cliente.</CardDescription>
                </div>
                {!isIngeniero && (
                  <Button size="sm" onClick={() => router.push(`/opportunities/new?clientId=${clientId}`)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Nueva Oportunidad
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Negocio</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Probabilidad</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Cierre Est.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities && opportunities.length > 0 ? opportunities.map(opp => (
                      <TableRow key={opp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/opportunities/${opp.id}`)}>
                        <TableCell className="font-bold">{opp.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">{opp.stage}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${opp.probability}%` }} />
                            </div>
                            <span className="text-xs font-mono">{opp.probability}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {opp.currency} {opp.value.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(opp.closeDate, 'P')}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground italic">
                          No hay oportunidades registradas para este cliente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents View */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary" /> Repositorio de Documentos</CardTitle>
                <CardDescription>Archivos cargados en contratos y oportunidades relacionadas.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allDocuments.length > 0 ? (
                  <div className="divide-y border-t">
                    {allDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="p-2 bg-slate-100 rounded">
                            <FileText className="h-6 w-6 text-slate-500" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-sm truncate pr-4">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[9px] py-0">{doc.source}: {doc.sourceId}</Badge>
                              <span className="text-[10px] text-muted-foreground">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}>
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.url} download={doc.name}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-muted-foreground border-t italic">
                    No se han encontrado documentos adjuntos para este cliente.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities & Contacts View */}
          <TabsContent value="activities" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t('Pages.contacts')}</CardTitle>
                  {!isIngeniero && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => router.push(`/contacts/new?clientId=${clientId}`)}><PlusCircle className="h-5 w-5" /></Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {contacts && contacts.length > 0 ? contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border">
                            <AvatarFallback className="text-[10px] font-bold">{contact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm">{contact.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">{contact.position || 'Sin cargo'}</div>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => router.push(`/contacts/${contact.id}`)}><ExternalLink className="h-4 w-4" /></Button>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-sm text-muted-foreground italic">No hay contactos registrados.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2"><ActivityIcon className="h-5 w-5 text-primary" /> {t('Dashboard.recentActivities.title')}</CardTitle>
                  {!isIngeniero && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => router.push(`/clients/${clientId}/activity`)}><PlusCircle className="h-5 w-5" /></Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {activities && activities.length > 0 ? activities.slice(0, 4).map(activity => (
                      <div key={activity.id} className="p-4 hover:bg-muted/20 transition-colors space-y-1">
                        <div className="flex justify-between items-center mb-1">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase py-0">{t(`Activity.types.${activity.type}`)}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">{formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: dateLocale })}</span>
                        </div>
                        <div className="text-xs text-foreground line-clamp-2 italic leading-relaxed"><RenderWithMentions text={activity.description} /></div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-sm text-muted-foreground italic">Sin actividades registradas.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <FilePreviewModal 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen} 
        file={previewFile} 
      />

      {client && (
        <PreBillingModal 
          isOpen={isPreBillingOpen} 
          onOpenChange={setIsPreBillingOpen} 
          client={client} 
          services={clientServices} 
          equipment={allEquip || []} 
          contracts={contracts || []}
          pos={allPos || []}
        />
      )}
    </div>
  );
}
