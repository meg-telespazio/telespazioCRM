'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Location, LocationType, LocationStatus, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import { addLocation, updateLocation } from '@/lib/firestore/locations';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const locationTypes: LocationType[] = ['branch', 'headquarters', 'warehouse', 'office', 'property', 'field'];
const statusOptions: LocationStatus[] = ['active', 'suspended'];

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.locationNameMin')),
    clientId: z.string().min(1, t('Validation.selectClient')),
    type: z.enum(locationTypes, { required_error: t('Validation.fieldRequired') }),
    status: z.enum(statusOptions, { required_error: t('Validation.fieldRequired') }),
    streetName: z.string().min(1, t('Validation.fieldRequired')),
    streetNumber: z.string().min(1, t('Validation.fieldRequired')),
    city: z.string().min(1, t('Validation.fieldRequired')),
    province: z.string().min(1, t('Validation.fieldRequired')),
    country: z.string().min(1, t('Validation.fieldRequired')),
    postalCode: z.string().min(1, t('Validation.fieldRequired')),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    notes: z.string().optional(),
  });

type LocationFormData = z.infer<ReturnType<typeof getFormSchema>>;

function LocationFormContent() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const { toast } = useToast();

    const locationId = params.id as string;
    const isNew = locationId === 'new';
    const clientIdFromQuery = searchParams.get('clientId');

    const locationDocRef = useMemo(() => {
        if (!firestore || isNew) return null;
        return doc(firestore, 'locations', locationId);
    }, [firestore, locationId, isNew]);
    const { data: locationData, loading: locationLoading } = useDoc<Location>(locationDocRef);

    const clientsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      const ref = collection(firestore, 'clients');
      if (user.role === 'admin') return query(ref);
      return query(ref, where('management', '==', user.management));
    }, [firestore, user]);

    const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);

    const formSchema = useMemo(() => getFormSchema(t), [t]);
    const form = useForm<LocationFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            clientId: clientIdFromQuery || '',
            type: 'branch',
            status: 'active',
            streetName: '',
            streetNumber: '',
            city: '',
            province: '',
            country: '',
            postalCode: '',
            latitude: 0,
            longitude: 0,
            notes: '',
        },
    });

    useEffect(() => {
        if (locationData) {
            form.reset(locationData);
        }
    }, [locationData, form]);

    useEffect(() => {
        if (!userLoading && !user) {
            redirect('/login');
        }
    }, [user, userLoading]);

    async function onSubmit(values: LocationFormData) {
        if (!user) return;
        try {
            if (isNew) {
                await addLocation(firestore, user.uid, values as any);
                toast({ variant: 'success', title: t('Locations.save') });
            } else {
                await updateLocation(firestore, locationId, values as any);
                toast({ variant: 'success', title: t('Locations.save') });
            }
            router.push(`/clients/${values.clientId}/locations`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    if (userLoading || clientsLoading || (locationLoading && !isNew)) {
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }
    
    return (
        <div className="flex flex-1 flex-col">
            <AppHeader title={isNew ? t('Locations.add') : t('Locations.edit')} />
            <main className="flex-1 p-4 sm:p-6">
                <div className="mx-auto max-w-2xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Card>
                                <CardContent className="space-y-6 p-6">
                                     <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('Locations.name')}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>{t('Pages.clients')}</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!clientIdFromQuery}><FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl><SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>{t('Locations.type')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{locationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                        <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>{t('Locations.status')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    </div>
                                </CardContent>
                            </Card>
                             <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>{t('Actions.back')}</Button>
                                <Button type="submit">{t('Locations.save')}</Button>
                             </div>
                        </form>
                    </Form>
                </div>
            </main>
        </div>
    );
}

export default function LocationFormSuspense() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <LocationFormContent />
    </Suspense>
  );
}
