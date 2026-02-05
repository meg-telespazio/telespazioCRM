'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Opportunity, Client } from '@/lib/types';
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
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(2, t('Validation.titleMin')),
    clientId: z.string().min(1, t('Validation.selectClient')),
    value: z.coerce.number().min(0, t('Validation.valuePositive')),
    stage: z.enum(['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost']),
    probability: z.number().min(0).max(100),
    closeDate: z.date(),
  });

type OpportunityFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function OpportunityFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();

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

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);

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
    },
  });
  
  useEffect(() => {
    if (opportunityData) {
      form.reset(opportunityData);
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
    } catch(error) {
        console.error("Failed to save opportunity", error);
        // The error is globally emitted, so a toast will appear.
    }
  }
  
  const stages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  const pageIsLoading = userLoading || clientsLoading || (opportunityLoading && !isNew);
  
  if (pageIsLoading) {
      return (
        <div className="flex flex-1 flex-col">
            <AppHeader title={isNew ? t('Forms.addOpportunity') : t('Forms.editOpportunity')} />
            <main className="flex-1 p-4 sm:p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </main>
        </div>
      )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isNew ? t('Forms.addOpportunity') : t('Forms.editOpportunity')}>
         <Button variant="outline" onClick={() => router.back()}>
            {t('Auth.cancelLabel')}
        </Button>
        <Button onClick={form.handleSubmit(onSubmit)}>
            {t('Forms.saveOpportunity')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
           <Card>
            <CardContent className="p-6">
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('Dashboard.recentOpportunities.valueHeader')} (USD)
                    </FormLabel>
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
            </CardContent>
           </Card>
            
           <Card>
            <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <FormField
              control={form.control}
              name="closeDate"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>{t('Forms.estCloseDate')}</FormLabel>
                  <Popover>
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
                            format(field.value, 'PPP')
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
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            </CardContent>
           </Card>
          </form>
        </Form>
        </div>
      </main>
    </div>
  );
}
