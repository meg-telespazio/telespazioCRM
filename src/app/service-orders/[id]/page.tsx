'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { doc, collection, query, where } from 'firebase/firestore';
import type { 
  ServiceOrder, 
  Contract, 
  Client, 
  UserProfile, 
  ServiceOrderItem
} from '@/lib/types';
import { 
  addServiceOrder, 
  updateServiceOrder, 
  addSOComment 
} from '@/lib/firestore/service-orders';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, ClipboardList, User, ShieldCheck, Clock, Loader2, MapPin, ShieldAlert, Paperclip, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SOItemManager } from '@/components/service-orders/so-item-manager';
import { SOComments } from '@/components/service-orders/so-comments';
import { SOAttachmentsManager } from '@/components/service-orders/so-attachments-manager';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  contractId: z.string().min(1, 'Contrato requerido'),
  type: z.enum(['Alta', 'Modificación', 'Baja']),
  status: z.enum(['Abierta', 'Asignada', 'Devuelta', 'Cancelada', 'Cerrada']),
  pmAssignedId: z.string().optional(),
  starfleetAccount: z.string().optional(),
  specialEntryConditions: z.boolean().default(false),
});

export default function SODetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const soId = params.id as string;
  const isNew = soId === 'new';
  const contractIdFromQuery = searchParams.get('contractId');

  const { user } = useUser();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = useState(false);

  // Data fetching
  const soDocRef = useMemo(() => isNew ? null : doc(firestore, 'service_orders', soId), [firestore, soId, isNew]);
  const { data: so, loading: soLoading } = useDoc<ServiceOrder>(soDocRef);

  const managementFilter = user?.role === 'admin' ? null : user?.management;

  const contractsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const ref = collection(firestore, 'contracts');
    return managementFilter 
      ? query(ref, where('management', '==', managementFilter)) 
      : query(ref);
  }, [firestore, user, managementFilter]);

  const clientsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    return managementFilter 
      ? query(ref, where('management', '==', managementFilter)) 
      : query(ref);
  }, [firestore, user, managementFilter]);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);

  const { data: contracts } = useCollection<Contract>(contractsQuery);
  const { data: clients } = useCollection<Client>(clientsQuery);
  const { data: allUsers } = useCollection<UserProfile>(usersQuery);

  const itemsQuery = useMemoFirebase(() => 
    isNew ? null : collection(firestore, 'service_orders', soId, 'items'), 
    [firestore, soId, isNew]
  );
  const { data: items } = useCollection<ServiceOrderItem>(itemsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractId: '',
      type: 'Alta',
      status: 'Abierta',
      pmAssignedId: '',
      starfleetAccount: '',
      specialEntryConditions: false,
    },
  });

  const watchedContractId = form.watch('contractId');
  const watchedStatus = form.watch('status');

  const selectedContract = useMemo(() => contracts?.find(c => c.id === watchedContractId), [contracts, watchedContractId]);
  const selectedClient = useMemo(() => clients?.find(c => c.id === selectedContract?.clientId), [clients, selectedContract]);

  const engineers = useMemo(() => allUsers?.filter(u => u.role === 'ingeniero' || u.role === 'admin') || [], [allUsers]);

  // Sync contractId from URL if it's a new SO
  useEffect(() => {
    if (isNew && contractIdFromQuery) {
      form.setValue('contractId', contractIdFromQuery);
    }
  }, [isNew, contractIdFromQuery, form]);

  useEffect(() => {
    if (so) {
      form.reset({
        contractId: so.contractId,
        type: so.type,
        status: so.status,
        pmAssignedId: so.pmAssignedId || '',
        starfleetAccount: so.starfleetAccount || '',
        specialEntryConditions: so.specialEntryConditions || false,
      });
    }
  }, [so, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !selectedContract || !selectedClient) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un contrato válido para continuar.' });
      return;
    }
    setIsSaving(true);

    const data: any = {
      ...values,
      contractId: selectedContract.id,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      cuit: selectedClient.cuit,
      management: selectedContract.management,
      eeccId: so?.eeccId || user.uid,
      dates: {
        createdAt: so?.dates?.createdAt || new Date(),
        contractStart: selectedContract.startDate,
        contractDuration: selectedContract.durationMonths,
      }
    };

    try {
      if (isNew) {
        const newId = await addServiceOrder(firestore, user.uid, data);
        toast({ variant: 'success', title: t('SO.saveSuccess') });
        router.push(`/service-orders/${newId}`);
      } else {
        // Validacion de cierre
        if (values.status === 'Cerrada') {
          const allItemsClosed = items?.every(i => i.isClosed);
          if (!allItemsClosed) {
            toast({ variant: 'destructive', title: t('SO.cannotClose') });
            setIsSaving(false);
            return;
          }
        }

        await updateServiceOrder(firestore, soId, data);
        
        // Log status change if changed
        if (so.status !== values.status) {
          await addSOComment(firestore, soId, user as any, `Estado cambiado de ${so.status} a ${values.status}`, values.status);
        }

        toast({ variant: 'success', title: t('SO.saveSuccess') });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLocked = useMemo(() => {
    if (!so || user?.role === 'admin' || user?.role === 'gerente') return false;
    return user?.uid !== so.eeccId && user?.uid !== so.pmAssignedId;
  }, [so, user]);

  if (soLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/service-orders')} className="text-muted-foreground hover:text-primary transition-colors">
            {t('Sidebar.serviceOrders')}
          </button>
          <span className="text-muted-foreground">/</span>
          <span>{isNew ? t('SO.createNew') : so?.publicId}</span>
        </div>
      }>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      {t('SO.details')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <FormField control={form.control} name="specialEntryConditions" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-primary/5 border-primary/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2 text-primary">
                            <ShieldAlert className="h-4 w-4" />
                            {t('Forms.specialEntryConditions')}
                          </FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} /></FormControl>
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="contractId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contrato Relacionado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!isNew || isLocked}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Seleccionar contrato...">
                                  {selectedContract ? (
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3 w-3 text-primary" />
                                      <span className="font-bold">{selectedContract.publicId}</span>
                                    </div>
                                  ) : "Contrato..."}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contracts?.map(c => {
                                const contractClient = clients?.find(cl => cl.id === c.clientId);
                                return (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex flex-col">
                                      <span className="font-bold">{c.publicId}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase">{contractClient?.name || 'Cliente...'}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                              {(!contracts || contracts.length === 0) && <SelectItem value="none" disabled>No se encontraron contratos disponibles</SelectItem>}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Movimiento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Alta">{t('SO.alta')}</SelectItem>
                              <SelectItem value="Modificación">{t('SO.modificacion')}</SelectItem>
                              <SelectItem value="Baja">{t('SO.baja')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                    {selectedClient && (
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg grid grid-cols-2 gap-4 animate-in fade-in">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span>
                          <p className="text-sm font-bold text-slate-800">{selectedClient.name}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Contrato Vinculado</span>
                          <p className="text-sm font-mono font-bold text-primary">{selectedContract?.publicId}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="pmAssignedId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('SO.pm')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Asignar Ingeniero..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {engineers.map(e => <SelectItem key={e.uid} value={e.uid}>{e.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado de la Orden</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                            <FormControl><SelectTrigger className={cn("bg-white font-bold", field.value === 'Cerrada' && "text-green-600")}><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {['Abierta', 'Asignada', 'Devuelta', 'Cerrada', 'Cancelada'].map(s => (
                                <SelectItem key={s} value={s}>{t(`Status.${s}`)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="starfleetAccount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starfleet Account (Opcional)</FormLabel>
                        <FormControl><Input {...field} className="bg-white" placeholder="SF-XXXXXX" disabled={isLocked} /></FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving || isLocked} size="lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('Forms.save')}
                  </Button>
                </div>
              </form>
            </Form>

            {isNew ? (
              <Card className="border-dashed bg-slate-50">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <MapPin className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-600">Gestión de Ítems por Sucursal</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Primero guarde los datos generales de la Service Order para habilitar la carga de servicios y equipos por sucursal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <SOItemManager 
                  soId={soId} 
                  clientId={so?.clientId || ''} 
                  soType={so?.type || 'Alta'} 
                  disabled={isLocked}
                />
                
                <SOAttachmentsManager 
                  soId={soId} 
                  attachments={so?.attachments}
                  disabled={isLocked}
                />

                <SOComments soId={soId} />
              </>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-slate-50 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase text-slate-500">Info Operativa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-xs">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-slate-400">Creada el</p>
                    <p className="font-medium">{so?.dates?.createdAt ? format(so.dates.createdAt, 'PPp') : '-'}</p>
                  </div>
                </div>
                {so?.eeccId && (
                  <div className="flex items-center gap-3 text-xs">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-slate-400">Ejecutivo de Cuentas</p>
                      <p className="font-medium">{allUsers?.find(u => u.uid === so.eeccId)?.displayName}</p>
                    </div>
                  </div>
                )}
                {so?.pmAssignedId && (
                  <div className="flex items-center gap-3 text-xs">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-slate-400">PM Asignado</p>
                      <p className="font-medium">{allUsers?.find(u => u.uid === so.pmAssignedId)?.displayName}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
