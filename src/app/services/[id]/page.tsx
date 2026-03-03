
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { doc } from 'firebase/firestore';
import type { Service } from '@/lib/types';
import { updateService } from '@/lib/firestore/services';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const getFormSchema = (t: (key: string) => string) => z.object({
  serviceNickname: z.string().min(1, t('Validation.fieldRequired')),
  serviceLineNumber: z.string().min(1, t('Validation.fieldRequired')),
  partnerName: z.string().optional(),
  customerName: z.string().optional(),
  customerAccountNumber: z.string().optional(),
  servicePlan: z.string().optional(),
  serviceAllocationGb: z.coerce.number().min(0),
  topUp: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'ARS']).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  isTelespazioOwned: z.boolean().default(true),
});

type ServiceFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ServiceEditPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const serviceId = params.id as string;

  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const serviceDocRef = useMemo(() => {
    if (!firestore || !serviceId) return null;
    return doc(firestore, 'services', serviceId);
  }, [firestore, serviceId]);

  const { data: service, loading: serviceLoading } = useDoc<Service>(serviceDocRef);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      serviceNickname: '',
      serviceLineNumber: '',
      partnerName: '',
      customerName: '',
      customerAccountNumber: '',
      servicePlan: '',
      serviceAllocationGb: 0,
      topUp: '',
      currency: 'USD',
      monthlyFee: 0,
      isTelespazioOwned: true,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        serviceNickname: service.serviceNickname || '',
        serviceLineNumber: service.serviceLineNumber || '',
        partnerName: service.partnerName || '',
        customerName: service.customerName || '',
        customerAccountNumber: service.customerAccountNumber || '',
        servicePlan: service.servicePlan || '',
        serviceAllocationGb: service.serviceAllocationGb || 0,
        topUp: service.topUp || '',
        currency: service.currency || 'USD',
        monthlyFee: service.monthlyFee || 0,
        isTelespazioOwned: service.isTelespazioOwned !== undefined ? service.isTelespazioOwned : true,
      });
    }
  }, [service, form]);

  const onSubmit = async (values: ServiceFormData) => {
    if (!user || !serviceId) return;
    try {
      await updateService(firestore, serviceId, values);
      toast({
        variant: 'success',
        title: t('Actions.saveSuccess'),
        description: 'Service updated successfully.',
      });
      router.back();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Actions.saveErrorGeneric'),
        description: error.message,
      });
    }
  };

  const isLoading = userLoading || serviceLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6"><Skeleton className="h-96 w-full" /></main>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Service not found.</p>
        <Button variant="link" onClick={() => router.back()}>{t('Actions.back')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Services.edit')}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Actions.back')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    {service.serviceNickname}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="serviceNickname" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.serviceNickname')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="serviceLineNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.serviceLineNumber')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="servicePlan" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.servicePlan')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="serviceAllocationGb" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.serviceAllocationGb')}</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.currency')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={t('Forms.currency')} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="ARS">ARS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="monthlyFee" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.monthlyFee')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator className="my-2" />

                  <FormField
                    control={form.control}
                    name="isTelespazioOwned"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('Forms.isTelespazioOwned')}
                          </FormLabel>
                          <FormDescription>
                            {field.value ? t('Services.telespazioEquipment') : t('Services.clientEquipment')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.customerName')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerAccountNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.customerAccountNumber')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="partnerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.partnerName')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="topUp" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.topUp')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  {t('Services.save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
