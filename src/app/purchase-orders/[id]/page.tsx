
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, query, where, doc } from 'firebase/firestore';
import type { PurchaseOrder, Contract, Contact } from '@/lib/types';
import { addPurchaseOrder, updatePurchaseOrder } from '@/lib/firestore/purchase-orders';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const getFormSchema = (t: (key: string) => string) => z.object({
  poNumber: z.string().min(1, t('Validation.fieldRequired')),
  emissionDate: z.date(),
  buyerId: z.string().min(1, t('Validation.fieldRequired')),
  amount: z.coerce.number().min(0),
  currency: z.enum(['USD', 'EUR', 'ARS']),
  status: z.enum(['pending', 'approved', 'canceled', 'received']),
  contractId: z.string().min(1, t('Validation.fieldRequired')),
  idContractStarfleet: z.string().optional(),
  idClientStarfleet: z.string().optional(),
});

type POFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function POFormPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = params?.id as string;
  const isNew = poId === 'new';
  const contractIdFromQuery = searchParams.get('contractId');

  const [mounted, setMounted] = useState(false);
  const [isEmissionDateOpen, setEmissionDateOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { user } = useUser();
  const firestore = useFirestore();

  const docRef = useMemo(() => (!firestore || !poId || isNew) ? null : doc(firestore, 'purchaseOrders', poId), [firestore, poId, isNew]);
  const { data: poData, loading: poLoading } = useDoc<PurchaseOrder>(docRef);

  const contractsQuery = useMemo(() => user ? query(collection(firestore, 'contracts'), where('createdBy', '==', user.uid)) : null, [user, firestore]);
  const { data: contracts } = useCollection<Contract>(contractsQuery);

  const form = useForm<POFormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      poNumber: '',
      emissionDate: new Date(),
      buyerId: '',
      amount: 0,
      currency: 'USD',
      status: 'pending',
      contractId: contractIdFromQuery || '',
      idContractStarfleet: '',
      idClientStarfleet: '',
    },
  });

  const watchedContractId = form.watch('contractId');

  const contactsQuery = useMemo(() => {
    if (!firestore || !watchedContractId || !contracts) return null;
    const contract = contracts.find(c => c.id === watchedContractId);
    if (!contract) return null;
    return query(collection(firestore, 'contacts'), where('clientId', '==', contract.clientId));
  }, [contracts, watchedContractId, firestore]);
  
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  useEffect(() => {
    if (poData) {
      form.reset({
        ...poData,
        emissionDate: new Date(poData.emissionDate),
      });
    }
  }, [poData, form]);

  const onSubmit = async (values: POFormData) => {
    if (!user) return;
    try {
      if (isNew) {
        await addPurchaseOrder(firestore, user.uid, values);
      } else {
        await updatePurchaseOrder(firestore, poId, values);
      }
      router.back();
    } catch (err) {
      console.error(err);
    }
  };

  const pageIsLoading = !mounted || poLoading || !contracts;
  if (pageIsLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isNew ? t('PO.add') : t('PO.edit')}>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>{t('Actions.back')}</Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="grid gap-6 p-6">
                  <FormField control={form.control} name="poNumber" render={({ field }) => (
                    <FormItem><FormLabel>{t('Forms.poNumber')}</FormLabel>
                    <FormControl><Input {...field} placeholder="Referencia manual..." /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contractId" render={({ field }) => (
                    <FormItem><FormLabel>{t('Forms.contract')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!contractIdFromQuery}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar contrato..." /></SelectTrigger></FormControl>
                      <SelectContent>{contracts?.map(c => <SelectItem key={c.id} value={c.id}>{c.publicId}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="emissionDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>{t('Forms.emissionDate')}</FormLabel>
                      <Popover open={isEmissionDateOpen} onOpenChange={setEmissionDateOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'P') : <span>{t('Forms.pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} onAccept={() => setEmissionDateOpen(false)} onCancel={() => setEmissionDateOpen(false)} initialFocus captionLayout="dropdown" startMonth={new Date(2000, 0)} endMonth={new Date(2050, 11)} /></PopoverContent></Popover></FormItem>
                    )} />
                    <FormField control={form.control} name="buyerId" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.buyer')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedContractId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar comprador..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {contacts && contacts.length > 0 ? (
                            contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                          ) : (
                            <SelectItem value="none" disabled>{t('Table.noResults')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.amount')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.currency')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="ARS">ARS</SelectItem></SelectContent></Select></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>{t('Forms.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="pending">{t('Status.pending')}</SelectItem><SelectItem value="approved">{t('Status.approved')}</SelectItem><SelectItem value="canceled">{t('Status.canceled')}</SelectItem><SelectItem value="received">{t('Status.received')}</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="idContractStarfleet" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.idContractStarfleet')}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="idClientStarfleet" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.idClientStarfleet')}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end gap-4">
                <Button type="submit"><Save className="mr-2 h-4 w-4"/>{t('Forms.save')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
