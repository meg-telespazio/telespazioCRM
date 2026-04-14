'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Service, ProductOrService, ServiceStatus } from '@/lib/types';
import { updateService } from '@/lib/firestore/services';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Zap, Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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
  status: z.enum(['active', 'paused', 'canceled']),
  statusUpdateDate: z.date().optional(),
  activationDate: z.date().optional(),
});

type ServiceFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ServiceEditPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const serviceId = params.id as string;

  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [isStatusDatePickerOpen, setStatusDatePickerOpen] = useState(false);
  const [isActivationDatePickerOpen, setActivationDatePickerOpen] = useState(false);

  const serviceDocRef = useMemo(() => {
    if (!firestore || !serviceId) return null;
    return doc(firestore, 'services', serviceId);
  }, [firestore, serviceId]);

  const { data: service, loading: serviceLoading } = useDoc<Service>(serviceDocRef);

  // Fetch Service Catalog Plans
  const catalogQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'productsAndServices'),
      where('status', '==', 'active')
    );
  }, [user, firestore]);

  const { data: catalogItems, loading: catalogLoading } = useCollection<ProductOrService>(catalogQuery);

  const servicePlans = useMemo(() => {
    if (!catalogItems) return [];
    return catalogItems
      .filter(item => item.type === 'service' || item.type === 'bundle')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogItems]);

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
      status: 'active',
      statusUpdateDate: undefined,
      activationDate: undefined,
    },
  });

  const watchedStatus = form.watch('status');

  // Logic: Auto-update statusUpdateDate when status changes from active
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'status' && value.status !== 'active') {
        form.setValue('statusUpdateDate', new Date());
      } else if (name === 'status' && value.status === 'active') {
        form.setValue('statusUpdateDate', undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
        currency: (service.currency as any) || 'USD',
        monthlyFee: service.monthlyFee || 0,
        isTelespazioOwned: service.isTelespazioOwned !== undefined ? service.isTelespazioOwned : true,
        status: service.status || 'active',
        statusUpdateDate: service.statusUpdateDate ? new Date(service.statusUpdateDate) : undefined,
        activationDate: service.activationDate ? new Date(service.activationDate) : undefined,
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

  const isLoading = userLoading || serviceLoading || catalogLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6 text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        </main>
      </div>
    );
  }

  const statusOptions: ServiceStatus[] = ['active', 'paused', 'canceled'];

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
                    {service?.serviceNickname}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {/* Status & Dates Section */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-muted/30 p-4 rounded-lg border border-dashed">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Table.status')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{t(`Status.${opt}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="statusUpdateDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('Forms.statusUpdateDate')}</FormLabel>
                        <Popover open={isStatusDatePickerOpen} onOpenChange={setStatusDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal bg-white",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={watchedStatus === 'active'}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: dateLocale })
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
                              onAccept={() => setStatusDatePickerOpen(false)}
                              onCancel={() => setStatusDatePickerOpen(false)}
                              initialFocus
                              locale={dateLocale}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="activationDate" render={({ field }) => (
                      <FormItem className="flex flex-col sm:col-span-2 mt-2">
                        <FormLabel className="text-primary font-bold flex items-center gap-2">
                          <Zap className="h-3 w-3" />
                          {t('Forms.activationDate')}
                        </FormLabel>
                        <Popover open={isActivationDatePickerOpen} onOpenChange={setActivationDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-bold border-primary/30 bg-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: dateLocale })
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
                              onAccept={() => setActivationDatePickerOpen(false)}
                              onCancel={() => setActivationDatePickerOpen(false)}
                              initialFocus
                              locale={dateLocale}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Fecha original de alta del servicio.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('PS.selectUnit')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {servicePlans.map(plan => (
                              <SelectItem key={plan.id} value={plan.name}>
                                {plan.name} {plan.type === 'bundle' ? '(Combo)' : ''}
                              </SelectItem>
                            ))}
                            {servicePlans.length === 0 && (
                              <SelectItem value="none" disabled>No active plans in catalog</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>Seleccione un plan del catálogo configurado.</FormDescription>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
