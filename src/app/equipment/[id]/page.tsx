
'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const getFormSchema = (t: (key: string) => string) => z.object({
  id: z.string().min(1, t('Validation.fieldRequired')),
  userTerminal: z.string().min(1, t('Validation.fieldRequired')),
  type: z.string().min(1, t('Validation.fieldRequired')),
  physicalStatus: z.enum(['Activa', 'En reparación', 'Retirada']),
  installationDate: z.date().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export default function EquipmentFormPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const { user } = useUser();
  const firestore = useFirestore();

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
    },
  });

  useEffect(() => {
    if (eqData) {
      form.reset({
        ...eqData,
        installationDate: eqData.installationDate ? new Date(eqData.installationDate) : undefined,
        latitude: eqData.latitude,
        longitude: eqData.longitude,
      });
    }
  }, [eqData, form]);

  const onSubmit = async (values: z.infer<ReturnType<typeof getFormSchema>>) => {
    if (!user) return;
    try {
      if (isNew) {
        await addEquipment(firestore, user.uid, values as any);
      } else {
        await updateEquipment(firestore, id, values as any);
      }
      router.back();
    } catch (error: any) {
      console.error("Error saving equipment:", error);
    }
  };

  if (eqLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isNew ? t('Equipment.add') : t('Equipment.edit')}>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>{t('Actions.back')}</Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="grid gap-6 p-6">
                  <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem><FormLabel>{t('Forms.userTerminalId')}</FormLabel>
                    <FormControl><Input {...field} placeholder="UUID..." /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="userTerminal" render={({ field }) => (
                    <FormItem><FormLabel>{t('Forms.userTerminal')}</FormLabel>
                    <FormControl><Input {...field} placeholder="Serial o Nickname..." /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Antena Standard">Antena Standard</SelectItem><SelectItem value="Antena HP">Antena HP</SelectItem><SelectItem value="KIT Enterprise">KIT Enterprise</SelectItem></SelectContent></Select></FormItem>
                    )} />
                    <FormField control={form.control} name="physicalStatus" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.physicalStatus')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Activa">Activa</SelectItem><SelectItem value="En reparación">En reparación</SelectItem><SelectItem value="Retirada">Retirada</SelectItem></SelectContent></Select></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="installationDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>{t('Forms.installationDate')}</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'P') : <span>{t('Forms.pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem><FormLabel>{t('Locations.latitude')}</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} placeholder="-34.6037" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem><FormLabel>{t('Locations.longitude')}</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} placeholder="-58.3816" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit"><Save className="mr-2 h-4 w-4"/>{t('Forms.save')}</Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
