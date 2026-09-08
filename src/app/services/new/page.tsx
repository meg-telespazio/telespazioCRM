'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, query, where } from 'firebase/firestore';
import type { PurchaseOrder, ProductOrService, Contract, Client } from '@/lib/types';
import { addServiceWithEquipment } from '@/lib/firestore/services';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Zap, Loader2, HardDrive, ShoppingCart, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const getFormSchema = (t: (key: string) => string) => z.object({
  // Service Data
  serviceNickname: z.string().min(1, t('Validation.fieldRequired')),
  serviceLineNumber: z.string().min(1, t('Validation.fieldRequired')),
  servicePlan: z.string().min(1, t('Validation.fieldRequired')),
  serviceAllocationGb: z.coerce.number().min(0),
  currency: z.enum(['USD', 'EUR', 'ARS']),
  monthlyFee: z.coerce.number().min(0),
  isTelespazioOwned: z.boolean().default(true),
  poId: z.string().min(1, t('Validation.fieldRequired')),
  activationDate: z.date().optional(),
  
  // Equipment Data
  equipmentId: z.string().min(1, t('Validation.fieldRequired')), // UUID
  equipmentSerial: z.string().min(1, t('Validation.fieldRequired')),
  equipmentType: z.string().min(1, t('Validation.fieldRequired')),
  equipmentStatus: z.enum(['Activa', 'En reparación', 'Retirada']),
  isClientOwned: z.boolean().default(true),
  comodatoFee: z.coerce.number().min(0).optional(),
});

type ServiceNewFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ServiceNewPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = useState(false);
  const [isActivationDatePickerOpen, setActivationDatePickerOpen] = useState(false);

  // Data fetching
  const posQuery = useMemo(() => {
    if (!user || !firestore) return null;
    if (user.role === 'admin') return query(collection(firestore, 'purchaseOrders'));
    return query(collection(firestore, 'purchaseOrders'), where('management', '==', user.management));
  }, [user, firestore]);

  const catalogQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'productsAndServices'),
      where('status', '==', 'active')
    );
  }, [user, firestore]);

  const { data: pos, loading: posLoading } = useCollection<PurchaseOrder>(posQuery);
  const { data: catalogItems, loading: catalogLoading } = useCollection<ProductOrService>(catalogQuery);
  
  // For context display
  const contractsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'contracts'));
  }, [user, firestore]);
  const clientsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'clients'));
  }, [user, firestore]);

  const { data: contracts } = useCollection<Contract>(contractsQuery);
  const { data: clients } = useCollection<Client>(clientsQuery);

  const servicePlans = useMemo(() => {
    if (!catalogItems) return [];
    return catalogItems
      .filter(item => item.type === 'service' || item.type === 'bundle')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogItems]);

  const form = useForm<ServiceNewFormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      serviceNickname: '',
      serviceLineNumber: '',
      servicePlan: '',
      serviceAllocationGb: 0,
      currency: 'USD',
      monthlyFee: 0,
      isTelespazioOwned: true,
      poId: '',
      activationDate: new Date(),
      equipmentId: '',
      equipmentSerial: '',
      equipmentType: 'Antena Standard',
      equipmentStatus: 'Activa',
      isClientOwned: true,
      comodatoFee: 0,
    },
  });

  const watchedPoId = form.watch('poId');
  const watchedIsTelespazioOwned = form.watch('isTelespazioOwned');

  const selectedPoContext = useMemo(() => {
    if (!watchedPoId || !pos || !contracts || !clients) return null;
    const po = pos.find(p => p.id === watchedPoId);
    if (!po) return null;
    const contract = contracts.find(c => c.id === po.contractId);
    if (!contract) return null;
    const client = clients.find(c => c.id === contract.clientId);
    return { po, contract, client };
  }, [watchedPoId, pos, contracts, clients]);

  const onSubmit = async (values: ServiceNewFormData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const serviceData = {
        serviceNickname: values.serviceNickname,
        serviceLineNumber: values.serviceLineNumber,
        servicePlan: values.servicePlan,
        serviceAllocationGb: values.serviceAllocationGb,
        currency: values.currency,
        monthlyFee: values.monthlyFee,
        isTelespazioOwned: values.isTelespazioOwned,
        status: 'active',
        poId: values.poId,
        activationDate: values.activationDate || null,
      };

      const equipmentData = {
        id: values.equipmentId,
        userTerminal: values.equipmentSerial,
        type: values.equipmentType,
        physicalStatus: values.equipmentStatus,
        isClientOwned: values.isClientOwned,
        comodatoFee: values.comodatoFee,
      };

      await addServiceWithEquipment(firestore, user.uid, serviceData, equipmentData);
      
      toast({
        variant: 'success',
        title: t('Actions.saveSuccess'),
        description: 'Servicio y equipo creados correctamente.',
      });
      router.push('/services');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Actions.saveErrorGeneric'),
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = userLoading || posLoading || catalogLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.services')}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Actions.back')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Context Section */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Vínculo Comercial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="poId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.poNumber')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Seleccione la Orden de Compra..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pos?.map(po => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.poNumber} ({po.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {selectedPoContext && (
                    <div className="grid grid-cols-2 gap-4 text-xs bg-white p-3 rounded border animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-bold uppercase block">Cliente</span>
                        <span className="font-bold text-primary">{selectedPoContext.client?.name}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-bold uppercase block">Contrato</span>
                        <span className="font-medium">{selectedPoContext.contract?.publicId}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Detalles del Servicio
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="serviceNickname" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.serviceNickname')}</FormLabel>
                        <FormControl><Input {...field} placeholder="Nickname único..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="serviceLineNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.serviceLineNumber')}</FormLabel>
                        <FormControl><Input {...field} placeholder="Ej: LINE-001" /></FormControl>
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
                            <SelectTrigger><SelectValue placeholder="Seleccione plan..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {servicePlans.map(plan => (
                              <SelectItem key={plan.id} value={plan.name}>{plan.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.currency')} /></SelectTrigger></FormControl>
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

                  <FormField control={form.control} name="activationDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('Forms.activationDate')}</FormLabel>
                      <Popover open={isActivationDatePickerOpen} onOpenChange={setActivationDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
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
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="isTelespazioOwned" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('Forms.isTelespazioOwned')}</FormLabel>
                        <FormDescription>{field.value ? 'El equipo pertenece a la empresa.' : 'Equipo del cliente.'}</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Equipment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    Datos del Equipo Asociado
                  </CardTitle>
                  <CardDescription>Esta información creará un registro en el inventario.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="equipmentId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.userTerminalId')}</FormLabel>
                        <FormControl><Input {...field} placeholder="UUID / Terminal ID..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="equipmentSerial" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.userTerminal')}</FormLabel>
                        <FormControl><Input {...field} placeholder="Serial o Kit Number..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="equipmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.type')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Antena Standard">Antena Standard</SelectItem>
                            <SelectItem value="Antena HP">Antena HP</SelectItem>
                            <SelectItem value="KIT Enterprise">KIT Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="equipmentStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.physicalStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Activa">Activa</SelectItem>
                            <SelectItem value="En reparación">En reparación</SelectItem>
                            <SelectItem value="Retirada">Retirada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  <FormField control={form.control} name="isClientOwned" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('Forms.isClientOwned')}</FormLabel>
                        <FormDescription>Si el equipo es propiedad del cliente.</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />

                  {!form.watch('isClientOwned') && (
                    <FormField control={form.control} name="comodatoFee" render={({ field }) => (
                      <FormItem className="animate-in fade-in">
                        <FormLabel>{t('Forms.comodatoFee')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
                  {t('Auth.cancelLabel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
