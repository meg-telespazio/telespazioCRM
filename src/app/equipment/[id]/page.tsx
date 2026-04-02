'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { doc } from 'firebase/firestore';
import type { Equipment } from '@/lib/types';
import { addEquipment, updateEquipment } from '@/lib/firestore/equipment';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { CalendarIcon, Save, ArrowLeft, ShieldCheck, User, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const getFormSchema = (t: (key: string) => string) => z.object({
  id: z.string().min(1, t('Validation.fieldRequired')),
  userTerminal: z.string().min(1, t('Validation.fieldRequired')),
  type: z.string().min(1, t('Validation.fieldRequired')),
  physicalStatus: z.enum(['Activa', 'En reparación', 'Retirada'], {
    required_error: t('Validation.fieldRequired'),
  }),
  installationDate: z.date().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  isClientOwned: z.boolean().default(true),
  comodatoFee: z.coerce.number().min(0).optional(),
});

export default function EquipmentFormPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const isNew = id === 'new';

  const { user } = useUser();
  const firestore = useFirestore();

  const [isInstallationDateOpen, setInstallationDateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const docRef = useMemo(() => isNew ? null : doc(firestore, 'equipment', id), [firestore, id, isNew]);
  const { data: eqData, loading: eqLoading } = useDoc<Equipment>(docRef);

  const form = useForm<z.infer<ReturnType<typeof getFormSchema>>>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      id: '',
      userTerminal: '',
      type: 'Antena Standard',
      physicalStatus: 'Activa',
      installationDate: undefined,
      latitude: undefined,
      longitude: undefined,
      isClientOwned: true,
      comodatoFee: 0,
    },
  });

  const watchedIsClientOwned = form.watch('isClientOwned');

  useEffect(() => {
    if (eqData) {
      form.reset({
        ...eqData,
        type: eqData.type || 'Antena Standard',
        physicalStatus: eqData.physicalStatus || 'Activa',
        installationDate: eqData.installationDate ? new Date(eqData.installationDate) : undefined,
        latitude: eqData.latitude,
        longitude: eqData.longitude,
        isClientOwned: eqData.isClientOwned !== undefined ? eqData.isClientOwned : true,
        comodatoFee: eqData.comodatoFee || 0,
      });
    }
  }, [eqData, form]);

  const onSubmit = async (values: z.infer<ReturnType<typeof getFormSchema>>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (isNew) {
        await addEquipment(firestore, user.uid, values as any);
      } else {
        await updateEquipment(firestore, id, values as any);
      }
      toast({
        variant: 'success',
        title: t('Actions.saveSuccess'),
        description: 'Equipo guardado correctamente en el inventario.',
      });
      router.back();
    } catch (error: any) {
      console.error("Error saving equipment:", error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (eqLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/equipment" className="text-muted-foreground hover:text-primary transition-colors">{t('Sidebar.equipment')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{isNew ? t('Equipment.add') : (eqData?.userTerminal || t('Equipment.edit'))}</span>
        </div>
      }>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>{t('Actions.back')}</Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="grid gap-6 p-6">
                  <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.userTerminalId')}</FormLabel>
                      <FormControl><Input {...field} placeholder="UUID..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="userTerminal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.userTerminal')}</FormLabel>
                      <FormControl><Input {...field} placeholder="Serial o Nickname..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <div className="grid grid-cols-1 gap-4 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="isClientOwned"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              {field.value ? <User className="h-4 w-4 text-primary" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                              {t('Forms.isClientOwned')}
                            </FormLabel>
                            <FormDescription>
                              {field.value ? 'El equipo pertenece al cliente.' : 'Equipo propiedad de Telespazio en comodato.'}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!watchedIsClientOwned && (
                      <FormField
                                                control={form.control}
                        name="comodatoFee"
                        render={({ field }) => (
                          <FormItem className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <FormLabel>{t('Forms.comodatoFee')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">USD</span>
                                <Input type="number" step="0.01" {...field} className="pl-12" placeholder="0.00" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t pt-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.type')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('Forms.selectItem')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Antena Standard">Antena Standard</SelectItem>
                            <SelectItem value="Antena HP">Antena HP</SelectItem>
                            <SelectItem value="KIT Enterprise">KIT Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="physicalStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.physicalStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('Forms.selectStatus')} />
                            </SelectTrigger>
                          </FormControl>
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
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="installationDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('Forms.installationDate')}</FormLabel>
                        <Popover open={isInstallationDateOpen} onOpenChange={setInstallationDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, 'P', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                              mode="single" 
                              selected={field.value} 
                              onSelect={field.onChange} 
                              onAccept={() => setInstallationDateOpen(false)} 
                              onCancel={() => setInstallationDateOpen(false)} 
                              initialFocus 
                              captionLayout="dropdown" 
                              startMonth={new Date(2000, 0)} 
                              endMonth={new Date(2050, 11)} 
                              locale={dateLocale}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Locations.latitude')}</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} placeholder="-34.6037" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Locations.longitude')}</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} placeholder="-58.3816" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                  {t('Forms.save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
