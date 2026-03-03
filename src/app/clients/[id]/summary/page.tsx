'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contact, Location, Opportunity, Activity, Contract, PurchaseOrder, Service, Equipment } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Building, Mail, Phone, Globe, Edit, PlusCircle, MapPin, Activity as ActivityIcon, Linkedin, FileText, ShoppingCart, Zap, HardDrive, LayoutGrid, ExternalLink } from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';
import { cn } from '@/lib/utils';

const LocationsMap = dynamic(() => import('@/components/locations/locations-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[250px] w-full rounded-lg" />,
});

export default function ClientSummaryPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Data fetching
  const clientDocRef = useMemo(() => firestore ? doc(firestore, 'clients', clientId) : null, [firestore, clientId]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const contractsQuery = useMemo(() => user ? query(collection(firestore, 'contracts'), where('clientId', '==', clientId)) : null, [user, clientId, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const posQuery = useMemo(() => user ? query(collection(firestore, 'purchaseOrders')) : null, [user, firestore]);
  const { data: allPos } = useCollection<PurchaseOrder>(posQuery);

  const servicesQuery = useMemo(() => user ? query(collection(firestore, 'services')) : null, [user, firestore]);
  const { data: allServices } = useCollection<Service>(servicesQuery);

  const equipQuery = useMemo(() => user ? query(collection(firestore, 'equipment')) : null, [user, firestore]);
  const { data: allEquip } = useCollection<Equipment>(equipQuery);

  const contactsQuery = useMemo(() => user ? query(collection(firestore, 'contacts'), where('clientId', '==', clientId)) : null, [user, clientId, firestore]);
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const activitiesQuery = useMemo(() => user ? query(collection(firestore, 'activities'), where('clientId', '==', clientId)) : null, [user, clientId, firestore]);
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

  const isLoading = userLoading || clientLoading;

  if (isLoading) return <div className="p-6 space-y-6"><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;
  if (!client) return <div className="p-12 text-center"><p>Client not found.</p></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={client.name}>
        <Button variant="outline" onClick={() => router.push('/clients')}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
        <Button onClick={() => router.push(`/clients/${clientId}`)}><Edit className="mr-2 h-4 w-4" />{t('Actions.editClient')}</Button>
      </AppHeader>
      
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Info Card */}
        <Card className="overflow-hidden">
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
              <CardDescription className="text-base flex items-center gap-2">
                {t(`Industries.${client.industry}`)} • <span className="font-mono">{client.publicId}</span>
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
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 text-sm">
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
          </CardContent>
        </Card>

        {/* Financial Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          {/* Quick Stats for Contracts */}
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
        </div>

        {/* Contract -> PO -> Service -> Equipment Cascading View */}
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
                  return (
                    <AccordionItem key={contract.id} value={contract.id} className="border-b last:border-0 px-6">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant="outline" className="font-mono">{contract.publicId}</Badge>
                          <span className="font-bold text-base">{contract.type}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded italic">
                            {format(contract.startDate, 'P')} - {format(contract.endDate, 'P')}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6 space-y-4">
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{t('Sidebar.pos')}</span>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}><PlusCircle className="h-3 w-3 mr-1"/>Nueva PO</Button>
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
                                      <span className="font-bold text-sm">PO: {po.id}</span>
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
                <Button variant="link" className="mt-2" onClick={() => router.push(`/contracts/new?clientId=${clientId}`)}>Crear primer contrato</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts & Activities */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t('Pages.contacts')}</CardTitle>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => router.push(`/contacts/new?clientId=${clientId}`)}><PlusCircle className="h-5 w-5" /></Button>
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
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => router.push(`/clients/${clientId}/activity`)}><PlusCircle className="h-5 w-5" /></Button>
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
      </main>
    </div>
  );
}
