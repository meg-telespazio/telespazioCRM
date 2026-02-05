'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Opportunity, Client, Contact } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import {
  addOpportunity,
  updateOpportunity,
} from '@/lib/firestore/opportunities';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { WeekdayLabelFormatter } from 'react-day-picker';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
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
  });

type OpportunityFormData = z.infer<ReturnType<typeof getFormSchema>>;

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

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);
    
  const { data: allContactsData, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [clientsData]);

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
    },
  });

  const selectedClientId = form.watch('clientId');

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
      // The error is globally emitted, so a toast will appear.
    }
  }

  const stages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const contractMonthsOptions = [12, 24, 36];

  const pageIsLoading =
    userLoading ||
    clientsLoading ||
    contactsLoading ||
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
                <CardContent className="p-6 space-y-6">
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
                <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Dashboard.recentOpportunities.clientHeader')}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('Forms.selectClient')} />
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
                              <SelectValue placeholder={t('Forms.selectContact')} />
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
                <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.fcv')} (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t('Forms.opportunityValuePlaceholder')}
                            {...field}
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
                          onValueChange={(value) => field.onChange(Number(value))}
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
                        <FormLabel className='font-normal'>
                          {t('Forms.isTender')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                   <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel>{t('Forms.requestDate')}</FormLabel>
                        <Popover open={isRequestDatePickerOpen} onOpenChange={setRequestDatePickerOpen}><PopoverTrigger asChild><FormControl>
                          <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                            {field.value ? (format(field.value, 'PPP', { locale: datePickerLocale })) : (<span>{t('Forms.pickDate')}</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
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
                        <Popover open={isOfferDatePickerOpen} onOpenChange={setOfferDatePickerOpen}><PopoverTrigger asChild><FormControl>
                          <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                            {field.value ? (format(field.value, 'PPP', { locale: datePickerLocale })) : (<span>{t('Forms.pickDate')}</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
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
                        <Popover open={isCloseDatePickerOpen} onOpenChange={setCloseDatePickerOpen}>
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
                                  format(field.value, 'PPP', { locale: datePickerLocale })
                                ) : (
                                  <span>{t('Forms.pickDate')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
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
                <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                   <FormField
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Dashboard.recentOpportunities.stageHeader')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
              <div className="flex items-center justify-end gap-4 pt-4">
                 <Button type="button" variant="outline" onClick={() => router.back()}>
                    {t('Auth.cancelLabel')}
                 </Button>
                 <Button type="submit">
                   {t('Forms.saveOpportunity')}
                 </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
