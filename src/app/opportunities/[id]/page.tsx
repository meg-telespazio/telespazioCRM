'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type {
  Opportunity,
  Client,
  Contact,
  ProductOrService,
  OpportunityLineItem,
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
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
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

  return z.object({
    title: z.string().min(2, t('Validation.titleMin')),
    clientId: z.string().min(1, t('Validation.selectClient')),
    value: z.coerce.number().min(0, t('Validation.valuePositive')),
    stage: z.enum(['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost']),
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

export default function OpportunityFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t, locale } = useI18n();
  const datePickerLocale = locale === 'es' ? es : enUS;

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

  const opportunityDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'opportunities', opportunityId);
  }, [firestore, opportunityId, isNew]);

  const { data: opportunityData, loading: opportunityLoading } =
    useDoc<Opportunity>(opportunityDocRef);

  const baseClientQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const clientsQuery = useMemo(() => {
    if (!baseClientQuery) return null;
    return query(collection(firestore, 'clients'), baseClientQuery);
  }, [firestore, baseClientQuery]);

  const contactsQuery = useMemo(() => {
    if (!baseClientQuery) return null;
    return query(collection(firestore, 'contacts'), baseClientQuery);
  }, [firestore, baseClientQuery]);

  const productsAndServicesQuery = useMemo(() => {
    if (!baseClientQuery) return null;
    return query(
      collection(firestore, 'productsAndServices'),
      baseClientQuery,
      where('status', '==', 'active')
    );
  }, [firestore, baseClientQuery]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const { data: allContactsData, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);

  const {
    data: productsAndServices,
    loading: productsAndServicesLoading,
  } = useCollection<ProductOrService>(productsAndServicesQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

  const catalogItems = useMemo(() => {
    if (!productsAndServices) return [];
    return [...productsAndServices].sort((a, b) => a.name.localeCompare(b.name));
  }, [productsAndServices]);

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      clientId: '',
      value: 0,
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
    },
  });

  const {
    fields: lineItemFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const selectedClientId = form.watch('clientId');
  const watchedLineItems = form.watch('lineItems', []);
  const watchedContractMonths = form.watch('contractMonths');

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

  const { totalNrc, totalMrc, totalFcv } = useMemo(() => {
    const totals = (watchedLineItems || []).reduce(
      (acc, item) => {
        const nrc = item.quantity * item.oneTimeCharge * (1 - item.discount / 100);
        const mrc = item.quantity * item.recurringCharge * (1 - item.discount / 100);
        acc.nrc += nrc;
        acc.mrc += mrc;
        return acc;
      },
      { nrc: 0, mrc: 0 }
    );

    const fcv = totals.nrc + totals.mrc * watchedContractMonths;
    return { totalNrc: totals.nrc, totalMrc: totals.mrc, totalFcv: fcv };
  }, [watchedLineItems, watchedContractMonths]);

  useEffect(() => {
    form.setValue('value', totalFcv, { shouldValidate: true });
  }, [totalFcv, form]);

  const handleAddLineItem = () => {
    if (!selectedCatalogItem) return;
    append({
      itemId: selectedCatalogItem.id,
      name: selectedCatalogItem.name,
      description: selectedCatalogItem.description,
      quantity: adderState.quantity,
      oneTimeCharge: adderState.oneTimeCharge,
      recurringCharge: adderState.recurringCharge,
      discount: adderState.discount,
    });
    // Reset adder
    setAdderState({
      selectedCatalogItemId: '',
      quantity: 1,
      discount: 0,
      oneTimeCharge: 0,
      recurringCharge: 0,
    });
  };

  const filteredContacts = useMemo(() => {
    if (!allContactsData || !selectedClientId) return [];
    return allContactsData.filter(
      (contact) => contact.clientId === selectedClientId
    );
  }, [allContactsData, selectedClientId]);

  useEffect(() => {
    if (opportunityData) {
      form.reset({
        ...opportunityData,
        closeDate: new Date(opportunityData.closeDate),
        requestDate: new Date(opportunityData.requestDate),
        offerSentDate: opportunityData.offerSentDate
          ? new Date(opportunityData.offerSentDate)
          : undefined,
        contactId: opportunityData.contactId || '',
        lineItems: opportunityData.lineItems || [],
      });
    }
  }, [opportunityData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  async function onSubmit(values: OpportunityFormData) {
    if (!user) return;
    try {
      if (isNew) {
        await addOpportunity(firestore, user.uid, values);
      } else {
        await updateOpportunity(firestore, opportunityId, values);
      }
      router.push('/opportunities');
    } catch (error) {
      console.error('Failed to save opportunity', error);
    }
  }

  const stages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const contractMonthsOptions = [12, 24, 36];

  const pageIsLoading =
    userLoading ||
    clientsLoading ||
    contactsLoading ||
    productsAndServicesLoading ||
    (opportunityLoading && !isNew);

  if (pageIsLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader
          title={isNew ? t('Forms.addOpportunity') : t('Forms.editOpportunity')}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={isNew ? t('Forms.addOpportunity') : t('Forms.editOpportunity')}
      />
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="space-y-6 p-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Dashboard.recentOpportunities.opportunityHeader')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('Forms.opportunityTitlePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('Forms.descriptionPlaceholder')}
                            {...field}
                            className="h-24"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Dashboard.recentOpportunities.clientHeader')}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t('Forms.selectClient')}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.referenceContact')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedClientId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t('Forms.selectContact')}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.fcv')} (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            readOnly
                            className="font-bold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.contractMonths')}</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractMonthsOptions.map((months) => (
                              <SelectItem key={months} value={String(months)}>
                                {months} {t('Forms.contractMonths')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isTender"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-x-3 space-y-0 pt-8">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('Forms.isTender')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel>{t('Forms.requestDate')}</FormLabel>
                        <Popover
                          open={isRequestDatePickerOpen}
                          onOpenChange={setRequestDatePickerOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', {
                                    locale: datePickerLocale,
                                  })
                                ) : (
                                  <span>{t('Forms.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setRequestDatePickerOpen(false);
                              }}
                              initialFocus
                              locale={datePickerLocale}
                              formatters={{ formatWeekdayName }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offerSentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel>{t('Forms.offerSentDate')}</FormLabel>
                        <Popover
                          open={isOfferDatePickerOpen}
                          onOpenChange={setOfferDatePickerOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', {
                                    locale: datePickerLocale,
                                  })
                                ) : (
                                  <span>{t('Forms.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setOfferDatePickerOpen(false);
                              }}
                              initialFocus
                              locale={datePickerLocale}
                              formatters={{ formatWeekdayName }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="closeDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel>{t('Forms.estCloseDate')}</FormLabel>
                        <Popover
                          open={isCloseDatePickerOpen}
                          onOpenChange={setCloseDatePickerOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', {
                                    locale: datePickerLocale,
                                  })
                                ) : (
                                  <span>{t('Forms.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setCloseDatePickerOpen(false);
                              }}
                              initialFocus
                              locale={datePickerLocale}
                              formatters={{ formatWeekdayName }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Dashboard.recentOpportunities.stageHeader')}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('Forms.selectStage')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stages.map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {t(`Stages.${stage}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="probability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Forms.probability')} ({field.value}%)
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                    <CardTitle>{t('Forms.lineItems')}</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <div className='grid grid-cols-1 gap-4 items-end md:grid-cols-6'>
                        <div className='md:col-span-2'>
                          <Label>{t('PS.itemName')}</Label>
                           <Select value={adderState.selectedCatalogItemId} onValueChange={(id) => setAdderState(prev => ({ ...prev, selectedCatalogItemId: id }))}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Forms.selectItem')} />
                            </SelectTrigger>
                            <SelectContent>
                                {catalogItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        </div>
                        <div>
                          <Label>{t('Forms.quantity')}</Label>
                          <Input type='number' value={adderState.quantity} onChange={e => setAdderState(prev => ({ ...prev, quantity: Number(e.target.value) }))} min={1} />
                        </div>
                        <div>
                          <Label>{t('Table.nrc')}</Label>
                          <Input type='number' value={adderState.oneTimeCharge} onChange={e => setAdderState(prev => ({...prev, oneTimeCharge: Number(e.target.value)}))} disabled={!selectedCatalogItem?.isEditable}/>
                        </div>
                        <div>
                           <Label>{t('Table.mrc')}</Label>
                          <Input type='number' value={adderState.recurringCharge} onChange={e => setAdderState(prev => ({...prev, recurringCharge: Number(e.target.value)}))} disabled={!selectedCatalogItem?.isEditable}/>
                        </div>
                        <div className='flex gap-2'>
                           <div className='flex-1'>
                             <Label>{t('Forms.discount')}</Label>
                            <Select value={String(adderState.discount)} onValueChange={val => setAdderState(prev => ({...prev, discount: Number(val)}))} disabled={!selectedCatalogItem || !selectedCatalogItem.availableDiscounts?.length}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    {selectedCatalogItem?.availableDiscounts?.map(d => <SelectItem key={d} value={String(d)}>{d}%</SelectItem>)}
                                </SelectContent>
                            </Select>
                           </div>
                           <Button type='button' onClick={handleAddLineItem} disabled={!selectedCatalogItem} className='self-end'>
                             {t('Forms.addItem')}
                           </Button>
                        </div>
                    </div>

                    <Separator />
                    
                    <div className='w-full overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('PS.itemName')}</TableHead>
                            <TableHead className='text-right'>{t('Forms.quantity')}</TableHead>
                            <TableHead className='text-right'>{t('Table.nrc')}</TableHead>
                            <TableHead className='text-right'>{t('Table.mrc')}</TableHead>
                            <TableHead className='text-right'>{t('Forms.discount')}</TableHead>
                            <TableHead className='text-right'>{t('Table.totalNrc')}</TableHead>
                            <TableHead className='text-right'>{t('Table.totalMrc')}</TableHead>
                            <TableHead>{t('Table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItemFields.map((item, index) => {
                             const subtotalNrc = item.quantity * item.oneTimeCharge;
                             const subtotalMrc = item.quantity * item.recurringCharge;
                             const totalNrc = subtotalNrc * (1 - item.discount / 100);
                             const totalMrc = subtotalMrc * (1 - item.discount / 100);
                            return(
                              <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className='text-right'>{item.quantity}</TableCell>
                                <TableCell className='text-right'>${item.oneTimeCharge.toFixed(2)}</TableCell>
                                <TableCell className='text-right'>${item.recurringCharge.toFixed(2)}</TableCell>
                                <TableCell className='text-right'>{item.discount}%</TableCell>
                                <TableCell className='text-right font-medium'>${totalNrc.toFixed(2)}</TableCell>
                                <TableCell className='text-right font-medium'>${totalMrc.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button type='button' variant='ghost' size='icon' onClick={() => remove(index)}>
                                    <Trash2 className='h-4 w-4 text-destructive'/>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {lineItemFields.length === 0 && <TableRow><TableCell colSpan={8} className='text-center text-muted-foreground'>{t('Forms.noItems')}</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>

                    <Separator />
                    
                    <div className='flex justify-end'>
                       <div className='w-full max-w-sm space-y-2'>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>{t('Table.subtotal')} {t('Table.nrc')}</span>
                            <span className='font-medium'>${totalNrc.toFixed(2)}</span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>{t('Table.subtotal')} {t('Table.mrc')}</span>
                            <span className='font-medium'>${totalMrc.toFixed(2)}</span>
                          </div>
                          <Separator/>
                           <div className='flex justify-between text-lg font-bold'>
                            <span>{t('Forms.fcv')}</span>
                            <span>${totalFcv.toFixed(2)}</span>
                          </div>
                       </div>
                    </div>

                </CardContent>
              </Card>


              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  {t('Auth.cancelLabel')}
                </Button>
                <Button type="submit">{t('Forms.saveOpportunity')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
