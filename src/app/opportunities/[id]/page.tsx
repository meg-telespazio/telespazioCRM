'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type {
  Opportunity,
  Client,
  Contact,
  ProductOrService,
  SystemConfig,
  Contract,
  OpportunityRisk,
  OpportunityType,
  UserProfile,
} from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import {
  addOpportunity,
  updateOpportunity,
} from '@/lib/firestore/opportunities';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Trash2, Plus, Printer, Info, ShieldCheck, Briefcase, TrendingUp, ChevronRight, Target, Hash } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { WeekdayLabelFormatter } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { AttachmentsManager } from '@/components/opportunities/attachments-manager';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const getFormSchema = (t: (key: string) => string) => {
  const lineItemSchema = z.object({
    itemId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    quantity: z.coerce.number().min(1, t('Validation.quantityMin')),
    oneTimeCharge: z.coerce.number().min(0),
    recurringCharge: z.coerce.number().min(0),
    discount: z.coerce.number().min(0).max(100),
  });

  return z
    .object({
      title: z.string().min(2, t('Validation.titleMin')),
      clientId: z.string().min(1, t('Validation.selectClient')),
      salesforceId: z.string().optional().or(z.literal('')),
      value: z.coerce.number().min(0, t('Validation.valuePositive')),
      currency: z.string(),
      stage: z.enum([
        'Prospecting',
        'Proposal',
        'Negotiation',
        'Won',
        'Lost',
        'Canceled',
        'Suspended',
      ]),
      probability: z.number().min(0).max(100),
      closeDate: z.date(),
      contractMonths: z.coerce
        .number()
        .refine((val) => [12, 24, 36].includes(val), {
          message: t('Validation.selectContractMonths'),
        }),
      requestDate: z.date(),
      offerSentDate: z.date().optional(),
      description: z.string().optional(),
      isTender: z.boolean().default(false),
      contactId: z.string().optional().or(z.literal('')),
      lineItems: z.array(lineItemSchema).optional(),
      attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
        path: z.string(),
      })).optional(),
      generalDiscountPercentage: z.coerce.number().min(0).max(100).optional(),
      applyDiscountToNrc: z.boolean().optional().default(false),
      applyDiscountToMrc: z.boolean().optional().default(false),
      reason: z.string().optional(),
      competition: z.string().optional(),
      // New Fields
      risk: z.enum(['C-Low', 'B-Medium', 'A-High']),
      isPlanned: z.boolean().default(false),
      opportunityType: z.enum(['New Logo', 'New Business', 'Ampliacion', 'Renegociacion', 'Renovaciones']),
      projectManagerEmail: z.string().email().optional().or(z.literal('')),
      contractReferenceId: z.string().optional().or(z.literal('')),
      grossMarginPercentage: z.coerce.number().min(0).max(100),
      grossMarginAmount: z.coerce.number().min(0),
    })
    .superRefine((data, ctx) => {
      if (
        ['Lost', 'Canceled', 'Suspended'].includes(data.stage) &&
        (!data.reason || data.reason.trim().length < 10)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('Validation.reasonRequired'),
          path: ['reason'],
        });
      }
    });
};

type OpportunityFormData = z.infer<ReturnType<typeof getFormSchema>>;

type LineItemAdderState = {
  selectedCatalogItemId: string;
  quantity: number;
  discount: number;
  oneTimeCharge: number;
  recurringCharge: number;
};

const probabilityMap: Record<string, number> = {
  Prospecting: 10,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
  Canceled: 0,
  Suspended: 0,
};

export default function OpportunityFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const dateLocale = locale === 'es' ? es : enUS;
  const isFormLoaded = useRef(false);

  const [isRequestDatePickerOpen, setRequestDatePickerOpen] = useState(false);
  const [isOfferDatePickerOpen, setOfferDatePickerOpen] = useState(false);
  const [isCloseDatePickerOpen, setCloseDatePickerOpen] = useState(false);

  const [adderState, setAdderState] = useState<LineItemAdderState>({
    selectedCatalogItemId: '',
    quantity: 1,
    discount: 0,
    oneTimeCharge: 0,
    recurringCharge: 0,
  });

  const formatWeekdayName: WeekdayLabelFormatter = (day, options) => {
    return format(day, 'cccccc', { locale: options?.locale });
  };

  const opportunityId = params.id as string;
  const isNew = opportunityId === 'new';
  const clientIdFromQuery = searchParams.get('clientId');

  // Solo consultamos si hay usuario
  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  useEffect(() => {
    isFormLoaded.current = false;
  }, [opportunityId]);

  const opportunityDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'opportunities', opportunityId);
  }, [firestore, opportunityId, isNew]);

  const { data: opportunityData, loading: opportunityLoading } =
    useDoc<Opportunity>(opportunityDocRef);

  // Filtered clients by permission for selection
  const clientsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    if (user.role === 'gerente') return query(ref, where('management', '==', user.management));
    return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
  }, [user, firestore]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  // Fetch Engineers for PM selection
  const usersQuery = useMemo(() => (firestore ? query(collection(firestore, 'users')) : null), [firestore]);
  const { data: allUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const engineers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter(u => u.role === 'ingeniero' || u.role === 'admin')
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      title: '',
      clientId: clientIdFromQuery || '',
      salesforceId: '',
      value: 0,
      currency: 'USD',
      stage: 'Prospecting',
      probability: 10,
      closeDate: new Date(),
      contractMonths: 12,
      requestDate: new Date(),
      offerSentDate: undefined,
      description: '',
      isTender: false,
      contactId: '',
      lineItems: [],
      attachments: [],
      generalDiscountPercentage: 0,
      applyDiscountToNrc: false,
      applyDiscountToMrc: false,
      reason: '',
      competition: '',
      risk: 'C-Low',
      isPlanned: false,
      opportunityType: 'New Business',
      projectManagerEmail: '',
      contractReferenceId: '',
      grossMarginPercentage: 0,
      grossMarginAmount: 0,
    },
  });

  const watchedClientId = form.watch('clientId');

  const contactsQuery = useMemo(() => {
    if (!user || !firestore || !watchedClientId) return null;
    const ref = collection(firestore, 'contacts');
    return query(ref, where('clientId', '==', watchedClientId));
  }, [user, firestore, watchedClientId]);

  const { data: contactsData, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);

  const contacts = useMemo(() => {
    return contactsData || [];
  }, [contactsData]);

  const contractsQuery = useMemo(() => {
    if (!user || !firestore || !watchedClientId) return null;
    const ref = collection(firestore, 'contracts');
    return query(ref, where('clientId', '==', watchedClientId), where('status', '==', 'activo'));
  }, [user, firestore, watchedClientId]);

  const { data: clientContracts } = useCollection<Contract>(contractsQuery);

  const productsAndServicesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'productsAndServices'));
  }, [firestore]);

  const {
    data: allProductsAndServices,
    loading: productsAndServicesLoading,
  } = useCollection<ProductOrService>(productsAndServicesQuery);

  const productsAndServices = useMemo(() => {
    if (!allProductsAndServices) return [];
    return allProductsAndServices.filter((item) => item.status === 'active');
  }, [allProductsAndServices]);

  const catalogItems = useMemo(() => {
    if (!productsAndServices) return [];
    return [...productsAndServices].sort((a, b) => a.name.localeCompare(b.name));
  }, [productsAndServices]);

  const {
    fields: lineItemFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const watchedStage = form.watch('stage');
  const watchedLineItems = form.watch('lineItems', []);
  const watchedContractMonths = form.watch('contractMonths');
  const watchedGeneralDiscount = form.watch('generalDiscountPercentage', 0);
  const watchedApplyToNrc = form.watch('applyDiscountToNrc', false);
  const watchedApplyToMrc = form.watch('applyDiscountToMrc', false);

  const isLocked = useMemo(() => {
    if (isNew || !opportunityData) return false;
    return ['Won', 'Lost', 'Canceled', 'Suspended'].includes(opportunityData.stage);
  }, [isNew, opportunityData]);

  const canModify = useMemo(() => {
    if (isNew) return true;
    if (!opportunityData || !user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'gerente' && user.management === opportunityData.management) return true;
    return user.uid === opportunityData.assignedTo || user.uid === opportunityData.createdBy;
  }, [isNew, opportunityData, user]);

  const selectedCatalogItem = useMemo(() => {
    if (!adderState.selectedCatalogItemId || !catalogItems) return null;
    return catalogItems.find(
      (item) => item.id === adderState.selectedCatalogItemId
    );
  }, [adderState.selectedCatalogItemId, catalogItems]);

  useEffect(() => {
    if (selectedCatalogItem) {
      setAdderState((prev) => ({
        ...prev,
        oneTimeCharge: selectedCatalogItem.oneTimeCharge || 0,
        recurringCharge: selectedCatalogItem.recurringCharge || 0,
        discount: 0,
        quantity: 1,
      }));
    }
  }, [selectedCatalogItem]);

  const { totalFcv } =
    useMemo(() => {
      const lineTotals = (watchedLineItems || []).reduce(
        (acc, item) => {
          const nrc =
            item.quantity * item.oneTimeCharge * (1 - item.discount / 100);
          const mrc =
            item.quantity *
            item.recurringCharge *
            (1 - item.discount / 100);
          acc.nrc += nrc;
          acc.mrc += mrc;
          return acc;
        },
        { nrc: 0, mrc: 0 }
      );

      const discountMultiplier = 1 - (watchedGeneralDiscount || 0) / 100;

      const finalNrc = watchedApplyToNrc
        ? lineTotals.nrc * discountMultiplier
        : lineTotals.nrc;
      const finalMrc = watchedApplyToMrc
        ? lineTotals.mrc * discountMultiplier
        : lineTotals.mrc;

      const fcv = finalNrc + finalMrc * watchedContractMonths;

      return {
        totalFcv: fcv,
      };
    }, [
      watchedLineItems,
      watchedContractMonths,
      watchedGeneralDiscount,
      watchedApplyToNrc,
      watchedApplyToMrc,
    ]);

  useEffect(() => {
    const roundedFcv = parseFloat(totalFcv.toFixed(2));
    form.setValue('value', roundedFcv, { shouldValidate: true });
  }, [totalFcv, form]);

  useEffect(() => {
    if (watchedStage && probabilityMap[watchedStage] !== undefined) {
      form.setValue('probability', probabilityMap[watchedStage]);
    }
  }, [watchedStage, form]);

  const convertCurrency = (oldCurrency: string, newCurrency: string) => {
    if (!configData?.exchangeRates || oldCurrency === newCurrency) return;

    const getRate = (ccy: string) => {
      if (ccy === 'USD') return 1;
      return configData.exchangeRates.find(r => r.from === ccy)?.rate || 1;
    };

    const rateOld = getRate(oldCurrency);
    const rateNew = getRate(newCurrency);
    const factor = rateOld / rateNew;

    const currentItems = form.getValues('lineItems') || [];
    const updatedItems = currentItems.map(item => ({
      ...item,
      oneTimeCharge: parseFloat((item.oneTimeCharge * factor).toFixed(2)),
      recurringCharge: parseFloat((item.recurringCharge * factor).toFixed(2)),
    }));

    form.setValue('lineItems', updatedItems);
    toast({ variant: 'default', title: `Valores convertidos a ${newCurrency}` });
  };

  const handleAddLineItem = () => {
    if (!selectedCatalogItem) return;
  
    if (selectedCatalogItem.type === 'bundle' && selectedCatalogItem.bundleItems) {
      selectedCatalogItem.bundleItems.forEach(bundleItem => {
        const fullItem = catalogItems.find(ci => ci.id === bundleItem.itemId);
        if (fullItem) {
          append({
            itemId: fullItem.id,
            name: fullItem.name,
            description: fullItem.description,
            quantity: bundleItem.quantity,
            oneTimeCharge: fullItem.oneTimeCharge || 0,
            recurringCharge: fullItem.recurringCharge || 0,
            discount: 0,
          });
        }
      });
    } else {
      append({
        itemId: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        description: selectedCatalogItem.description,
        quantity: adderState.quantity,
        oneTimeCharge: adderState.oneTimeCharge,
        recurringCharge: adderState.recurringCharge,
        discount: adderState.discount,
      });
    }
  
    setAdderState({
      selectedCatalogItemId: '',
      quantity: 1,
      discount: 0,
      oneTimeCharge: 0,
      recurringCharge: 0,
    });
  };

  useEffect(() => {
    if (opportunityData && !isFormLoaded.current) {
      form.reset({
        ...opportunityData,
        currency: opportunityData.currency || 'USD',
        closeDate: new Date(opportunityData.closeDate),
        requestDate: new Date(opportunityData.requestDate),
        offerSentDate: opportunityData.offerSentDate
          ? new Date(opportunityData.offerSentDate)
          : undefined,
        contactId: opportunityData.contactId || '',
        salesforceId: opportunityData.salesforceId || '',
        lineItems: opportunityData.lineItems || [],
        attachments: opportunityData.attachments || [],
        generalDiscountPercentage:
          opportunityData.generalDiscountPercentage || 0,
        applyDiscountToNrc: opportunityData.applyDiscountToNrc || false,
        applyDiscountToMrc: opportunityData.applyDiscountToMrc || false,
        reason: opportunityData.reason || '',
        competition: opportunityData.competition?.join(', ') || '',
        risk: opportunityData.risk || 'C-Low',
        isPlanned: opportunityData.isPlanned || false,
        opportunityType: opportunityData.opportunityType || 'New Business',
        projectManagerEmail: opportunityData.projectManagerEmail || '',
        contractReferenceId: opportunityData.contractReferenceId || '',
        grossMarginPercentage: opportunityData.grossMarginPercentage || 0,
        grossMarginAmount: opportunityData.grossMarginAmount || 0,
      });
      isFormLoaded.current = true;
    }
  }, [opportunityData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  async function onSubmit(values: OpportunityFormData) {
    if (!user) return;
    const dataToSave = {
      ...values,
      competition: values.competition
        ? values.competition.split(',').map((s) => s.trim())
        : [],
    };
    try {
      if (isNew) {
        await addOpportunity(firestore, user.uid, dataToSave as any);
        toast({ variant: 'success', title: t('Actions.saveSuccess') });
      } else {
        await updateOpportunity(firestore, opportunityId, dataToSave);
        toast({ variant: 'success', title: t('Actions.saveSuccess') });
      }
      router.push('/opportunities');
    } catch (error: any) {
      console.error('Failed to save opportunity', error);
      toast({ variant: 'destructive', title: t('Actions.saveErrorGeneric'), description: error.message });
    }
  }

  const riskOptions: OpportunityRisk[] = ['C-Low', 'B-Medium', 'A-High'];
  const typeOptions: OpportunityType[] = ['New Logo', 'New Business', 'Ampliacion', 'Renegociacion', 'Renovaciones'];
  const stages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Canceled', 'Suspended'];
  const contractMonthsOptions = [12, 24, 36];
  const currencyOptions: string[] = configData?.currencies || ['USD', 'EUR', 'ARS'];

  const pageIsLoading =
    userLoading ||
    clientsLoading ||
    contactsLoading ||
    productsAndServicesLoading ||
    usersLoading ||
    (opportunityLoading && !isNew) ||
    !configData;

  if (pageIsLoading) {
    return <div className="flex flex-1 flex-col"><AppHeader title={t('App.loading')} /><main className="p-6"><Skeleton className="h-[70vh] w-full" /></main></div>;
  }

  const calendarRange = { startMonth: new Date(2000, 0), endMonth: new Date(2050, 11) };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/opportunities" className="text-muted-foreground hover:text-primary transition-colors">{t('Sidebar.opportunities')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{isNew ? t('Forms.addOpportunity') : (opportunityData?.publicId || t('Forms.editOpportunity'))}</span>
        </div>
      }>
        <Button variant="outline" onClick={() => router.push('/opportunities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Actions.backToOpportunityList')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/opportunities/${opportunityId}/print`)} disabled={isNew}>
          <Printer className="mr-2 h-4 w-4" />
          {t('Forms.printOffer')}
        </Button>
      </AppHeader>
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* SECCIÓN 1: DATOS GENERALES */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> {t('Forms.generalData')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase">{t('Profile.management')}</Label>
                      <div className="flex items-center gap-2 p-2 border rounded bg-muted/10 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {user?.management}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase">{t('Roles.ejecutivo')}</Label>
                      <div className="flex items-center gap-2 p-2 border rounded bg-muted/10 text-sm font-medium">
                        <Briefcase className="h-4 w-4 text-primary" />
                        {user?.displayName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>{t('Dashboard.recentOpportunities.opportunityHeader')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <FormControl><Input placeholder={t('Forms.opportunityTitlePlaceholder')} {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="salesforceId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          Salesforce ID
                        </FormLabel>
                        <FormControl><Input placeholder="006..." {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="risk" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.risk')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {riskOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="opportunityType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.opportunityType')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {typeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="projectManagerEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.projectManagerEmail')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Seleccionar Ingeniero..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {engineers.map(e => (
                              <SelectItem key={e.uid} value={e.email}>
                                {e.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isPlanned" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{t('Forms.isPlanned')}</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.description')}</FormLabel>
                      <FormControl><Textarea placeholder={t('Forms.descriptionPlaceholder')} {...field} className="h-24" disabled={isLocked} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* SECCIÓN 2: RELACIÓN CON EL CLIENTE */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> {t('Forms.clientRelation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Dashboard.recentOpportunities.clientHeader')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isNew || isLocked || !!clientIdFromQuery}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl>
                        <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.referenceContact')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedClientId || isLocked}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectContact')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>)}
                          {contacts.length === 0 && <SelectItem value="none" disabled>Sin contactos registrados</SelectItem>}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contractReferenceId" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('Forms.contractReference')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedClientId || isLocked}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar contrato vigente (opcional)" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Sin referencia --</SelectItem>
                          {clientContracts?.map((contract) => <SelectItem key={contract.id} value={contract.id}>{contract.publicId} ({contract.type})</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* SECCIÓN 3: CRONOGRAMA Y ESTADO */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" /> {t('Forms.scheduleStatus')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="requestDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('Forms.requestDate')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Popover open={isRequestDatePickerOpen} onOpenChange={setRequestDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')} disabled={isLocked}>
                              {field.value ? format(field.value, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setRequestDatePickerOpen(false)} onCancel={() => setRequestDatePickerOpen(false)} initialFocus locale={dateLocale} formatters={{ formatWeekdayName }} disabled={isLocked} captionLayout="dropdown" {...calendarRange} />
                          </PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="offerSentDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('Forms.offerSentDate')}</FormLabel>
                        <Popover open={isOfferDatePickerOpen} onOpenChange={setOfferDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')} disabled={isLocked}>
                              {field.value ? format(field.value, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setOfferDatePickerOpen(false)} onCancel={() => setOfferDatePickerOpen(false)} initialFocus locale={dateLocale} formatters={{ formatWeekdayName }} disabled={isLocked} captionLayout="dropdown" {...calendarRange} />
                          </PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="closeDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('Forms.estCloseDate')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Popover open={isCloseDatePickerOpen} onOpenChange={setCloseDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')} disabled={isLocked}>
                              {field.value ? format(field.value, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setCloseDatePickerOpen(false)} onCancel={() => setCloseDatePickerOpen(false)} initialFocus locale={dateLocale} formatters={{ formatWeekdayName }} disabled={isLocked} captionLayout="dropdown" {...calendarRange} />
                          </PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <FormField control={form.control} name="stage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Dashboard.recentOpportunities.stageHeader')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectStage')} /></SelectTrigger></FormControl>
                          <SelectContent>{stages.map((stage) => <SelectItem key={stage} value={stage}>{t(`Stages.${stage}`)}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="probability" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.probability')} ({field.value}%)</FormLabel>
                        <FormControl><Slider min={0} max={100} step={5} value={[field.value]} onValueChange={(value) => field.onChange(value[0])} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isTender" render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-x-3 space-y-0 pt-8">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /></FormControl>
                        <FormLabel className="font-normal">{t('Forms.isTender')}</FormLabel>
                      </FormItem>
                    )} />
                  </div>

                  {['Lost', 'Canceled', 'Suspended'].includes(watchedStage) && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField control={form.control} name="reason" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-destructive font-bold">{t('Forms.reason')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                          <FormControl><Textarea placeholder={t('Forms.reasonPlaceholder')} {...field} className="border-destructive/30" /></FormControl>
                          <FormDescription>Mínimo 10 caracteres.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECCIÓN 4: DATOS COMERCIALES */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> {t('Forms.commercialData')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="value" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.fcv')} ({form.watch('currency')}) <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <FormControl><Input type="number" {...field} readOnly className="font-bold bg-muted/20" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Table.currency')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Select onValueChange={(value) => { const oldCurrency = field.value; field.onChange(value); convertCurrency(oldCurrency, value); }} value={field.value} disabled={isLocked}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{currencyOptions.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contractMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Months')} <span className="text-red-500 ml-0.5">*</span></FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)} disabled={isLocked}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{contractMonthsOptions.map((months) => <SelectItem key={months} value={String(months)}>{months} {t('Months').toLowerCase()}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                    <FormField control={form.control} name="grossMarginPercentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.grossMarginPercentage')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="grossMarginAmount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.grossMarginAmount')} ({form.watch('currency')})</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 5: ÍTEMS DE LA OFERTA */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('Forms.lineItems')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-7">
                    <div className="md:col-span-2">
                      <Label className="text-xs">{t('PS.itemName')}</Label>
                      <Select value={adderState.selectedCatalogItemId} onValueChange={(id) => setAdderState((prev) => ({ ...prev, selectedCatalogItemId: id }))} disabled={isLocked}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger>
                        <SelectContent>{catalogItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t('Forms.quantity')}</Label>
                      <Input className="h-9" type="number" value={adderState.quantity} onChange={(e) => setAdderState((prev) => ({ ...prev, quantity: Number(e.target.value) }))} min={1} disabled={isLocked} />
                    </div>
                    <div>
                      <Label className="text-xs">{t('Table.nrc')}</Label>
                      <Input className="h-9" type="number" value={adderState.oneTimeCharge} onChange={(e) => setAdderState((prev) => ({ ...prev, oneTimeCharge: Number(e.target.value) }))} disabled={!selectedCatalogItem?.isEditable || isLocked} />
                    </div>
                    <div>
                      <Label className="text-xs">{t('Table.mrc')}</Label>
                      <Input className="h-9" type="number" value={adderState.recurringCharge} onChange={(e) => setAdderState((prev) => ({ ...prev, recurringCharge: Number(e.target.value) }))} disabled={!selectedCatalogItem?.isEditable || isLocked} />
                    </div>
                    <div>
                      <Label className="text-xs">{t('Forms.discount')}</Label>
                      <Select value={String(adderState.discount)} onValueChange={(val) => setAdderState((prev) => ({ ...prev, discount: Number(val) }))} disabled={ !selectedCatalogItem || !selectedCatalogItem.availableDiscounts?.length || isLocked }>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          {(selectedCatalogItem?.availableDiscounts || []).filter(d => d !== 0).map((d) => <SelectItem key={d} value={String(d)}>{`${d}%`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="icon" onClick={handleAddLineItem} disabled={!selectedCatalogItem || isLocked} className="self-end"><Plus className="h-4 w-4" /></Button>
                  </div>

                  <Separator />

                  <div className="w-full overflow-x-auto rounded-md border bg-card">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>{t('PS.itemName')}</TableHead>
                          <TableHead className="text-right">{t('Forms.quantity')}</TableHead>
                          <TableHead className="text-right">{t('Table.nrc')}</TableHead>
                          <TableHead className="text-right">{t('Table.mrc')}</TableHead>
                          <TableHead className="text-right">{t('Forms.discount')}</TableHead>
                          <TableHead className="text-right">{t('Table.totalNrc')}</TableHead>
                          <TableHead className="text-right font-bold">{t('Table.totalMrc')}</TableHead>
                          <TableHead className="text-right px-4">{t('Table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItemFields.map((item, index) => {
                          const totalNrc = item.quantity * item.oneTimeCharge * (1 - item.discount / 100);
                          const totalMrc = item.quantity * item.recurringCharge * (1 - item.discount / 100);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.oneTimeCharge.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${item.recurringCharge.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{item.discount}%</TableCell>
                              <TableCell className="text-right font-bold text-primary">${totalNrc.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold text-primary">${totalMrc.toFixed(2)}</TableCell>
                              <TableCell className="text-right px-4"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isLocked}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                            </TableRow>
                          );
                        })}
                        {lineItemFields.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">{t('Forms.noItems')}</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 6: DESCUENTOS Y OTROS */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('Forms.generalDiscount')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  <FormField control={form.control} name="generalDiscountPercentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.discount')}</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 0)} disabled={isLocked}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{[0, 5, 10, 15, 20, 25, 30].map((d) => <SelectItem key={d} value={String(d)}>{`${d}%`}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-4 pt-8">
                    <FormField control={form.control} name="applyDiscountToNrc" render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /></FormControl>
                        <FormLabel className="font-normal">{t('Forms.applyToNrc')}</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="applyDiscountToMrc" render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /></FormControl>
                        <FormLabel className="font-normal">{t('Forms.applyToMrc')}</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* SECCIÓN 7: ADJUNTOS Y COMPETENCIA */}
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('Forms.additionalInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <AttachmentsManager opportunityId={opportunityId} disabled={isLocked} />
                  <FormField control={form.control} name="competition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.competition')}</FormLabel>
                      <FormControl><Input placeholder={t('Forms.competitionPlaceholder')} {...field} disabled={isLocked} /></FormControl>
                      <FormDescription>{t('Forms.competitionDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Footer de Acciones */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>{t('Auth.cancelLabel')}</Button>
                <Button type="submit" disabled={isLocked || !canModify}>{t('Forms.saveOpportunity')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
