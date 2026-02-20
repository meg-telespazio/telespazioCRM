'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type {
  Contract,
  Client,
  Contact,
  ContractType,
  ContractStatus,
  ContractRenewalTerm,
} from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { addContract, updateContract } from '@/lib/firestore/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Save } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentsManager } from '@/components/contracts/attachments-manager';

const getFormSchema = (t: (key: string) => string) => {
  return z.object({
      clientId: z.string().min(1, t('Validation.selectClient')),
      type: z.enum(['Acuerdo Marco', 'Locación de Servicios', 'Compraventa', 'Locación de Equipos', 'Comodato de Equipos']),
      status: z.enum(['activo', 'vencido', 'renovado', 'renovado automatico']),
      amount: z.coerce.number().min(0),
      currency: z.enum(['USD', 'EUR', 'ARS']),
      country: z.string().min(1),
      startDate: z.date(),
      durationMonths: z.coerce.number().min(1),
      endDate: z.date(),
      signatureDate: z.date().optional(),
      autoRenews: z.boolean().default(false),
      renewalTerm: z.enum(['1 month', '2 months']).optional(),
      clientContactId: z.string().optional(),
      authorizedBy: z.string().optional(),
      hasSpecialClauses: z.boolean().default(false),
      specialClauses: z.string().optional(),
      notes: z.string().optional(),
      attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
        path: z.string(),
      })).optional(),
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

  const contractId = params.id as string;
  const isNew = contractId === 'new';
  const clientIdFromQuery = searchParams.get('clientId');

  const contractDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'contracts', contractId);
  }, [firestore, contractId, isNew]);

  const { data: contractData, loading: contractLoading } = useDoc<Contract>(contractDocRef);

  const baseClientQuery = useMemo(() => (user ? where('createdBy', '==', user.uid) : null), [user]);
  const clientsQuery = useMemo(() => baseClientQuery ? query(collection(firestore, 'clients'), baseClientQuery) : null, [firestore, baseClientQuery]);
  const contactsQuery = useMemo(() => baseClientQuery ? query(collection(firestore, 'contacts'), baseClientQuery) : null, [firestore, baseClientQuery]);

  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: allContactsData, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

  const clients = useMemo(() => clientsData ? [...clientsData].sort((a, b) => a.name.localeCompare(b.name)) : [], [clientsData]);

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clientIdFromQuery || '',
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
      clientContactId: '',
      authorizedBy: '',
      hasSpecialClauses: false,
      specialClauses: '',
      notes: '',
      attachments: [],
    },
  });

  const watchedClientId = form.watch('clientId');
  const watchedStartDate = form.watch('startDate');
  const watchedDuration = form.watch('durationMonths');
  const watchedAutoRenews = form.watch('autoRenews');
  const watchedHasSpecialClauses = form.watch('hasSpecialClauses');

  useEffect(() => {
    if (watchedStartDate && watchedDuration > 0) {
      form.setValue('endDate', addMonths(new Date(watchedStartDate), watchedDuration));
    }
  }, [watchedStartDate, watchedDuration, form]);

  const filteredContacts = useMemo(() => {
    if (!allContactsData || !watchedClientId) return [];
    return allContactsData.filter((contact) => contact.clientId === watchedClientId);
  }, [allContactsData, watchedClientId]);

  useEffect(() => {
    if (contractData) {
      form.reset({
        ...contractData,
        startDate: contractData.startDate ? new Date(contractData.startDate) : new Date(),
        endDate: contractData.endDate ? new Date(contractData.endDate) : new Date(),
        signatureDate: contractData.signatureDate ? new Date(contractData.signatureDate) : undefined,
      });
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

  const pageIsLoading = userLoading || clientsLoading || contactsLoading || (contractLoading && !isNew);
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
  const currencyOptions: Contract['currency'][] = ['USD', 'EUR', 'ARS'];
  const renewalTerms: ContractRenewalTerm[] = ['1 month', '2 months'];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isNew ? t('Pages.addContract') : t('Contracts.edit')} />
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="clientId" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Pages.clients')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!clientIdFromQuery}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="clientContactId" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.clientContact')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!watchedClientId}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectContact')} /></SelectTrigger></FormControl>
                    <SelectContent>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
              </CardContent></Card>

              <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('Contracts.selectType')} /></SelectTrigger></FormControl>
                    <SelectContent>{contractTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{contractStatuses.map(s => <SelectItem key={s} value={s}>{t(`ContractStatuses.${s}`)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.amount')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="currency" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.currency')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{currencyOptions.map(c => <SelectItem key={c} value={c}>{t(`Currencies.${c}`)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="country" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.country')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="authorizedBy" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.authorizedBy')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent></Card>
              
              <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('Contracts.startDate')}</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, 'PPP', { locale: datePickerLocale }) : <span>{t('Forms.pickDate')}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="signatureDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('Contracts.signatureDate')}</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, 'PPP', { locale: datePickerLocale }) : <span>{t('Forms.pickDate')}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('Contracts.endDate')}</FormLabel><FormControl>
                  <Input value={format(field.value, 'PPP', { locale: datePickerLocale })} readOnly disabled />
                </FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="durationMonths" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.durationMonths')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="autoRenews" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-x-3 space-y-0 rounded-md border p-4 h-full">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal">{t('Contracts.autoRenews')}</FormLabel></FormItem>)} />
                {watchedAutoRenews && <FormField control={form.control} name="renewalTerm" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.renewalTerm')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('Contracts.selectRenewal')} /></SelectTrigger></FormControl>
                    <SelectContent>{renewalTerms.map(rt => <SelectItem key={rt} value={rt}>{t(`RenewalTerms.${rt}`)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />}
              </CardContent></Card>
              
              <Card><CardContent className="p-6 space-y-4">
                 <FormField control={form.control} name="hasSpecialClauses" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-x-3 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal">{t('Contracts.hasSpecialClauses')}</FormLabel></FormItem>)} />
                 {watchedHasSpecialClauses && <FormField control={form.control} name="specialClauses" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.specialClauses')}</FormLabel>
                  <FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />}
                 <FormField control={form.control} name="notes" render={({ field }) => (<FormItem>
                  <FormLabel>{t('Contracts.notes')}</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent></Card>
              
              <AttachmentsManager disabled={false} />

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}><ArrowLeft />{t('Auth.cancelLabel')}</Button>
                <Button type="submit"><Save />{t('Contracts.save')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
