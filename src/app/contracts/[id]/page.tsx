'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type {
  Contract,
  Client,
  Contact,
  Opportunity,
  ContractType,
  ContractStatus,
  ContractRenewalTerm,
  ProductOrService,
  SystemConfig,
} from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { addContract, updateContract } from '@/lib/firestore/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths, isValid } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Save, Plus, Trash2, Zap, DollarSign, Briefcase, ChevronRight, Info, ShieldCheck, Clock, ClipboardList, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentsManager } from '@/components/contracts/attachments-manager';
import { AddendumManager } from '@/components/contracts/addendum-manager';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const getFormSchema = (t: (key: string) => string) => {
  return z.object({
      clientId: z.string().min(1, t('Validation.selectClient')),
      opportunityId: z.string().optional().or(z.literal('')),
      type: z.enum(['Acuerdo Marco', 'Locación de Servicios', 'Compraventa', 'Locación de Equipos', 'Comodato de Equipos']),
      status: z.enum(['activo', 'vencido', 'renovado', 'renovado automatico']),
      amount: z.coerce.number().min(0),
      currency: z.string(),
      country: z.string().min(1),
      startDate: z.date(),
      durationMonths: z.coerce.number().min(1),
      endDate: z.date(),
      signatureDate: z.date().optional(),
      autoRenews: z.boolean().default(false),
      renewalTerm: z.enum(['1 month', '2 months', '3 months', '12 months']).optional(),
      noticePeriod: z.coerce.number().optional().default(0),
      clientContactId: z.string().optional(),
      authorizedBy: z.string().optional(),
      hasSpecialClauses: z.boolean().default(false),
      specialClauses: z.string().optional(),
      notes: z.string().optional(),
      costCenterId: z.string().min(1, t('Validation.fieldRequired')),
      attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
        path: z.string(),
      })).optional(),
      priceList: z.array(z.object({
        planName: z.string().min(1),
        price: z.coerce.number().min(0),
      })).optional(),
      topUp50GbPrice: z.coerce.number().min(0).optional(),
      topUp500GbPrice: z.coerce.number().min(0).optional(),
    }).refine(data => !data.autoRenews || !!data.renewalTerm, {
        message: "Renewal term is required if auto-renews is selected",
        path: ["renewalTerm"],
    });
};

type ContractFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ContractFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const datePickerLocale = locale === 'es' ? es : enUS;

  const [mounted, setMounted] = useState(false);
  const [isStartDateOpen, setStartDateOpen] = useState(false);
  const [isSignatureDateOpen, setSignatureDateOpen] = useState(false);
  const isFormLoaded = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const contractId = params?.id as string;
  const isNew = contractId === 'new';
  const clientIdFromQuery = searchParams.get('clientId');

  // Reset flag when ID changes
  useEffect(() => {
    isFormLoaded.current = false;
  }, [contractId]);

  const contractDocRef = useMemo(() => {
    if (!firestore || !contractId || isNew) return null;
    return doc(firestore, 'contracts', contractId);
  }, [firestore, contractId, isNew]);

  const { data: contractData, loading: contractLoading } = useDoc<Contract>(contractDocRef);

  // Fetch system config for cost centers
  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  // Filtered clients by permission for selection
  const clientsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    if (user.role === 'gerente') return query(ref, where('management', '==', user.management));
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const clients = useMemo(() => clientsData ? [...clientsData].sort((a, b) => a.name.localeCompare(b.name)) : [], [clientsData]);
  
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clientIdFromQuery || '',
      opportunityId: '',
      type: 'Acuerdo Marco',
      status: 'activo',
      amount: 0,
      currency: 'USD',
      country: 'Argentina',
      startDate: new Date(),
      durationMonths: 12,
      endDate: addMonths(new Date(), 12),
      signatureDate: undefined,
      autoRenews: false,
      renewalTerm: undefined,
      noticePeriod: 0,
      clientContactId: '',
      authorizedBy: '',
      hasSpecialClauses: false,
      specialClauses: '',
      notes: '',
      costCenterId: '',
      attachments: [],
      priceList: [],
      topUp50GbPrice: 0,
      topUp500GbPrice: 0,
    },
  });

  const { fields: priceListFields, append: appendPriceItem, remove: removePriceItem } = useFieldArray({
    control: form.control,
    name: 'priceList',
  });

  const watchedClientId = form.watch('clientId');
  const watchedStartDate = form.watch('startDate');
  const watchedDuration = form.watch('durationMonths');
  const watchedAutoRenews = form.watch('autoRenews');
  const watchedHasSpecialClauses = form.watch('hasSpecialClauses');

  // Related Opportunities logic
  const oppsQuery = useMemoFirebase(() => {
    if (!watchedClientId || !firestore) return null;
    return query(collection(firestore, 'opportunities'), where('clientId', '==', watchedClientId), where('stage', '==', 'Won'));
  }, [firestore, watchedClientId]);
  const { data: wonOpportunities } = useCollection<Opportunity>(oppsQuery);

  // Contacts Logic
  const contactsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !watchedClientId) return null;
    return query(collection(firestore, 'contacts'), where('clientId', '==', watchedClientId));
  }, [user, firestore, watchedClientId]);
  const { data: allContactsData, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

  // Catalog Logic
  const psQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'productsAndServices'), where('status', '==', 'active'));
  }, [user, firestore]);
  const { data: catalogData, loading: catalogLoading } = useCollection<ProductOrService>(psQuery);

  const servicePlans = useMemo(() => {
    if (!catalogData) return [];
    return catalogData
      .filter(item => item.type === 'service' || item.type === 'bundle')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogData]);

  // Auto-set cost center if client has one (only for new contracts)
  useEffect(() => {
    if (isNew && watchedClientId && clientsData && configData?.costCenters) {
      const selectedClient = clientsData.find(c => c.id === watchedClientId);
      if (selectedClient?.costCenterId) {
        form.setValue('costCenterId', selectedClient.costCenterId);
      }
    }
  }, [isNew, watchedClientId, clientsData, configData, form]);

  const [newPriceItem, setNewPriceItem] = useState<{planName: string, price: number}>({ planName: '', price: 0 });

  useEffect(() => {
    const duration = Number(watchedDuration);
    if (watchedStartDate && isValid(watchedStartDate) && !isNaN(duration) && duration > 0) {
      const newEndDate = addMonths(new Date(watchedStartDate), duration);
      form.setValue('endDate', newEndDate, { shouldValidate: true });
    }
  }, [watchedStartDate, watchedDuration, form]);

  const filteredContacts = useMemo(() => {
    if (!allContactsData || !watchedClientId) return [];
    return allContactsData.filter((contact) => contact.clientId === watchedClientId);
  }, [allContactsData, watchedClientId]);

  // Load contract data once
  useEffect(() => {
    if (contractData && !isFormLoaded.current) {
      form.reset({
        ...contractData,
        startDate: contractData.startDate ? new Date(contractData.startDate) : new Date(),
        endDate: contractData.endDate ? new Date(contractData.endDate) : new Date(),
        signatureDate: contractData.signatureDate ? new Date(contractData.signatureDate) : undefined,
        priceList: contractData.priceList || [],
        topUp50GbPrice: contractData.topUp50GbPrice || 0,
        topUp500GbPrice: contractData.topUp500GbPrice || 0,
        attachments: contractData.attachments || [],
        costCenterId: contractData.costCenterId || '',
        noticePeriod: (contractData.noticePeriod as any) || 0,
        opportunityId: contractData.opportunityId || '',
      });
      isFormLoaded.current = true;
    }
  }, [contractData, form]);

  useEffect(() => { if (!userLoading && !user) redirect('/login'); }, [user, userLoading]);

  async function onSubmit(values: ContractFormData) {
    if (!user) return;
    try {
      if (isNew) {
        await addContract(firestore, user.uid, values as any);
      } else {
        await updateContract(firestore, contractId, values);
      }
      router.push('/contracts');
    } catch (error) {
      console.error('Failed to save contract', error);
    }
  }

  const handleAddPriceItem = () => {
    if (!newPriceItem.planName) return;
    appendPriceItem({ planName: newPriceItem.planName, price: newPriceItem.price });
    setNewPriceItem({ planName: '', price: 0 });
  };

  const pageIsLoading = !mounted || userLoading || clientsLoading || contactsLoading || catalogLoading || (contractLoading && !isNew) || !configData;
  if (pageIsLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={isNew ? t('Pages.addContract') : t('Contracts.edit')} />
        <main className="flex-1 p-4 sm:p-6"><Skeleton className="h-96 w-full" /></main>
      </div>
    );
  }

  const contractTypes: ContractType[] = ['Acuerdo Marco', 'Locación de Servicios', 'Compraventa', 'Locación de Equipos', 'Comodato de Equipos'];
  const contractStatuses: ContractStatus[] = ['activo', 'vencido', 'renovado', 'renovado automatico'];
  const currencyOptions: string[] = configData?.currencies || ['USD', 'EUR', 'ARS'];
  const renewalTerms: ContractRenewalTerm[] = ['1 month', '2 months', '3 months', '12 months'];
  const noticePeriodOptions = [0, 30, 60, 90];
  const costCenterOptions = configData.costCenters || [];

  const calendarRange = {
    startMonth: new Date(2000, 0),
    endMonth: new Date(2050, 11),
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/contracts" className="text-muted-foreground hover:text-primary transition-colors">{t('Sidebar.contracts')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{isNew ? t('Pages.addContract') : (contractData?.publicId || t('Contracts.edit'))}</span>
        </div>
      }>
        <div className="flex items-center gap-2">
          {!isNew && contractData?.status === 'activo' && (
            <Button 
              variant="outline" 
              className="border-primary text-primary"
              onClick={() => router.push(`/service-orders/new?contractId=${contractId}`)}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Generar SO
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
        </div>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="mx-auto max-w-4xl space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* SECCIÓN 1: DATOS GENERALES */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> {t('Forms.generalData')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Pages.clients')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!clientIdFromQuery}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="clientContactId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.clientContact')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedClientId}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectContact')} /></SelectTrigger></FormControl>
                        <SelectContent>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* SECCIÓN 2: ESPECIFICACIONES */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> {t('Contracts.type')} & {t('Forms.commercialData')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Contracts.selectType')} /></SelectTrigger></FormControl>
                        <SelectContent>{contractTypes.map(type => <SelectItem key={type} value={type}>{t(`ContractTypes.${type}`)}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="opportunityId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        {t('Contracts.opportunity')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Sin asociar --</SelectItem>
                          {wonOpportunities?.map(opp => (
                            <SelectItem key={opp.id} value={opp.id}>{opp.publicId} - {opp.title}</SelectItem>
                          ))}
                          {(!wonOpportunities || wonOpportunities.length === 0) && (
                            <SelectItem value="no-won" disabled>No hay oportunidades ganadas</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>Solo se listan negocios en etapa "Ganada".</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="costCenterId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        {t('Forms.costCenter')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {costCenterOptions.map(cc => (
                            <SelectItem key={cc.id} value={cc.id}>{cc.name} ({cc.id})</SelectItem>
                          ))}
                          {costCenterOptions.length === 0 && <SelectItem value="none" disabled>Configure centros de costo primero</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{contractStatuses.map(s => <SelectItem key={s} value={s}>{t(`ContractStatuses.${s}`)}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Contracts.amount')}</FormLabel>
                        <FormControl><Input type="number" {...field} placeholder={t('Forms.chargePlaceholder')} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Contracts.currency')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{currencyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.country')}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="authorizedBy" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.authorizedBy')}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
              
              {/* SECCIÓN 3: VIGENCIA Y PLAZOS */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> {t('Contracts.noticePeriod')} & {t('Forms.scheduleStatus')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('Contracts.startDate')}</FormLabel>
                      <Popover open={isStartDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, 'PPP', { locale: datePickerLocale }) : <span>{t('Forms.pickDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setStartDateOpen(false)} onCancel={() => setStartDateOpen(false)} initialFocus captionLayout="dropdown" {...calendarRange} locale={datePickerLocale} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="signatureDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('Contracts.signatureDate')}</FormLabel>
                      <Popover open={isSignatureDateOpen} onOpenChange={setSignatureDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, 'PPP', { locale: datePickerLocale }) : <span>{t('Forms.pickDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setSignatureDateOpen(false)} onCancel={() => setSignatureDateOpen(false)} initialFocus captionLayout="dropdown" {...calendarRange} locale={datePickerLocale} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('Contracts.endDate')}</FormLabel>
                      <FormControl>
                        <Input value={field.value ? format(field.value, 'PPP', { locale: datePickerLocale }) : ''} readOnly disabled className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="durationMonths" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.durationMonths')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="noticePeriod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Contracts.noticePeriod')}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 0)}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Contracts.selectNotice')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {noticePeriodOptions.map(val => (
                            <SelectItem key={val} value={String(val)}>{t(`NoticePeriods.${val}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex flex-col gap-4">
                    <FormField control={form.control} name="autoRenews" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-start gap-x-3 space-y-0 rounded-md border p-4 h-full">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal">{t('Contracts.autoRenews')}</FormLabel>
                      </FormItem>
                    )} />
                    {watchedAutoRenews && <FormField control={form.control} name="renewalTerm" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Contracts.renewalTerm')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t('Contracts.selectRenewal')} /></SelectTrigger></FormControl>
                          <SelectContent>{renewalTerms.map(rt => <SelectItem key={rt} value={rt}>{t(`RenewalTerms.${rt}`)}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />}
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 4: LISTA DE PRECIOS */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> {t('Contracts.priceList')} & {t('Contracts.topUps')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-4 items-end bg-muted/30 p-4 rounded-lg border border-dashed">
                    <div className="space-y-2">
                      <Label>{t('Contracts.planName')}</Label>
                      <Select 
                        value={newPriceItem.planName} 
                        onValueChange={(v) => setNewPriceItem(p => ({ ...p, planName: v }))}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t('Forms.selectItem')} />
                        </SelectTrigger>
                        <SelectContent>
                          {servicePlans.map(plan => (
                            <SelectItem key={plan.id} value={plan.name}>{plan.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Contracts.agreedPrice')}</Label>
                      <Input 
                        type="number" 
                        value={newPriceItem.price} 
                        onChange={(e) => setNewPriceItem(p => ({ ...p, price: Number(e.target.value) }))}
                        className="bg-background"
                      />
                    </div>
                    <Button type="button" onClick={handleAddPriceItem} disabled={!newPriceItem.planName}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('Contracts.addPlan')}
                    </Button>
                  </div>

                  <div className="border rounded-md overflow-hidden bg-white">
                    {priceListFields.length > 0 ? (
                      <ul className="divide-y">
                        {priceListFields.map((field, index) => (
                          <li key={field.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Zap className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-sm">{field.planName}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-primary">{form.watch('currency')} {field.price.toLocaleString()}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePriceItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground italic">
                        No hay planes cargados en la lista de precios.
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-base font-bold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        {t('Contracts.topUps')}
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="topUp50GbPrice" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Contracts.topUp50Gb')} ({form.watch('currency')})</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="topUp500GbPrice" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Contracts.topUp500Gb')} ({form.watch('currency')})</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* SECCIÓN 5: OBSERVACIONES */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('Contracts.hasSpecialClauses')} & {t('Contracts.notes')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <FormField control={form.control} name="hasSpecialClauses" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">{t('Contracts.hasSpecialClauses')}</FormLabel></FormItem>)} />
                   {watchedHasSpecialClauses && <FormField control={form.control} name="specialClauses" render={({ field }) => (<FormItem>
                    <FormLabel>{t('Contracts.specialClauses')}</FormLabel>
                    <FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />}
                   <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                    <FormLabel>{t('Contracts.notes')}</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder={t('Forms.notesPlaceholder')} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
              </Card>
              
              {!isNew && (
                <AddendumManager contractId={contractId} disabled={false} />
              )}

              <AttachmentsManager disabled={false} />

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Auth.cancelLabel')}</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />{t('Contracts.save')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
