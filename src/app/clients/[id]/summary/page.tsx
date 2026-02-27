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
import { ArrowLeft, Building, Mail, Phone, Globe, Edit, PlusCircle, MapPin, Activity as ActivityIcon, Linkedin, FileText, ShoppingCart, Zap, HardDrive, LayoutGrid } from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';

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
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage src={client.logoURL || undefined} />
              <AvatarFallback className="rounded-lg bg-muted"><Building className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{client.name}</CardTitle>
              <CardDescription>{t(`Industries.${client.industry}`)} • {client.publicId}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{client.phone}</span></div>
            <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /><span>CUIT: {client.cuit}</span></div>
          </CardContent>
        </Card>

        {/* Contract -> PO -> Service -> Equipment Cascading View */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t('Sidebar.contracts')} & Operaciones</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push(`/clients/${clientId}/services`)}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Ver Gestión de Servicios
            </Button>
          </CardHeader>
          <CardContent>
            {contracts && contracts.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {contracts.map(contract => {
                  const contractPos = allPos?.filter(p => p.contractId === contract.id) || [];
                  return (
                    <AccordionItem key={contract.id} value={contract.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant="outline">{contract.publicId}</Badge>
                          <span className="font-semibold">{contract.type}</span>
                          <span className="text-xs text-muted-foreground">{format(contract.startDate, 'P')} - {format(contract.endDate, 'P')}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 border-l-2 ml-2 space-y-4">
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{t('Sidebar.pos')}</span>
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}><PlusCircle className="h-3 w-3 mr-1"/>Nueva PO</Button>
                        </div>
                        {contractPos.length > 0 ? (
                          <Accordion type="multiple" className="w-full">
                            {contractPos.map(po => {
                              const poServices = allServices?.filter(s => s.poId === po.id) || [];
                              return (
                                <AccordionItem key={po.id} value={po.id} className="border-none">
                                  <AccordionTrigger className="py-2 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <ShoppingCart className="h-4 w-4 text-primary" />
                                      <span className="font-bold">PO: {po.id}</span>
                                      <Badge variant="secondary">{po.amount.toLocaleString()} {po.currency}</Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pl-6 space-y-2">
                                    {poServices.length > 0 ? (
                                      <div className="grid gap-2">
                                        {poServices.map(service => {
                                          const equipment = allEquip?.find(e => e.id === service.equipmentId);
                                          return (
                                            <div key={service.id} className="flex flex-col gap-1 p-3 border rounded-lg bg-background">
                                              <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                  <Zap className="h-4 w-4 text-yellow-500" />
                                                  <span className="font-bold">{service.serviceNickname}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground">{service.serviceLineNumber}</span>
                                              </div>
                                              <div className="text-xs text-muted-foreground">{service.servicePlan}</div>
                                              {equipment && (
                                                <div className="mt-2 flex items-center gap-2 text-xs bg-muted/50 p-2 rounded">
                                                  <HardDrive className="h-3 w-3" />
                                                  <span className="font-semibold">{equipment.userTerminal}</span>
                                                  <Badge variant="outline" className="text-[9px] h-4">{equipment.physicalStatus}</Badge>
                                                  {equipment.installationPlace && <span className="truncate">• {equipment.installationPlace}</span>}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic py-2">Sin servicios vinculados. Use el importador de servicios para cargar desde Excel.</div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">No hay órdenes de compra registradas para este contrato.</div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-20 mb-2" />
                <p>No hay contratos registrados.</p>
                <Button variant="link" onClick={() => router.push(`/contracts/new?clientId=${clientId}`)}>Crear primer contrato</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts & Activities */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('Pages.contacts')}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => router.push(`/contacts/new?clientId=${clientId}`)}><PlusCircle className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {contacts?.map(contact => (
                <div key={contact.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <div className="font-bold">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">{contact.position}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/contacts/${contact.id}`)}>{t('Actions.back')}</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('Dashboard.recentActivities.title')}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => router.push(`/clients/${clientId}/activity`)}><PlusCircle className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities?.slice(0, 3).map(activity => (
                <div key={activity.id} className="text-sm border-b pb-2 last:border-0">
                  <div className="flex justify-between font-bold text-xs mb-1">
                    <span>{t(`Activity.types.${activity.type}`)}</span>
                    <span className="text-muted-foreground">{formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: dateLocale })}</span>
                  </div>
                  <div className="line-clamp-2 text-muted-foreground italic"><RenderWithMentions text={activity.description} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
