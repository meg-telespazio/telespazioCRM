'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type { Contact, Client, EmailEntry, PhoneEntry, ContactPosition, ContactArea } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import { addContact, updateContact } from '@/lib/firestore/contacts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const positionOptions: ContactPosition[] = ['Analyst', 'CEO', 'CFO', 'CIO', 'CISO', 'Head', 'Manager'];
const areaOptions: ContactArea[] = ['Administration', 'IT', 'Legal', 'Marketing', 'Procurement', 'Sales', 'Supplier Payments'];

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.nameMin')),
    clientId: z.string().min(1, t('Validation.selectClient')),
    position: z.enum(positionOptions).optional(),
    area: z.enum(areaOptions).optional(),
    emails: z
      .array(
        z.object({
          type: z.enum(['work', 'personal', 'other']),
          address: z.string().email(t('Validation.invalidEmail')),
        })
      )
      .optional(),
    phones: z
      .array(
        z.object({
          type: z.enum(['mobile', 'landline', 'work', 'home']),
          number: z.string().min(10, t('Validation.phoneMin')),
        })
      )
      .optional(),
    notes: z.string().optional(),
  });

type ContactFormData = z.infer<ReturnType<typeof getFormSchema>>;

function ContactDetailForm() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const { toast } = useToast();

    const contactId = params.id as string;
    const isNew = contactId === 'new';
    const clientIdFromQuery = searchParams.get('clientId');

    const contactDocRef = useMemo(() => {
        if (!firestore || isNew) return null;
        return doc(firestore, 'contacts', contactId);
    }, [firestore, contactId, isNew]);
    const { data: contactData, loading: contactLoading } = useDoc<Contact>(contactDocRef);

    const clientsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      const ref = collection(firestore, 'clients');
      if (user.role === 'admin') return query(ref);
      if (user.role === 'gerente') return query(ref, where('management', '==', user.management));
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }, [firestore, user]);

    const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);
    
    const clients = useMemo(() => {
        if (!clientsData) return [];
        return [...clientsData].sort((a, b) => a.name.localeCompare(b.name));
    }, [clientsData]);

    const formSchema = useMemo(() => getFormSchema(t), [t]);
    const form = useForm<ContactFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            clientId: clientIdFromQuery || '',
            position: undefined,
            area: undefined,
            emails: [{ type: 'work', address: '' }],
            phones: [{ type: 'mobile', number: '' }],
            notes: '',
        },
    });

    useEffect(() => {
        if (contactData) {
            form.reset(contactData);
        }
    }, [contactData, form]);

    useEffect(() => {
        if (!userLoading && !user) {
            redirect('/login');
        }
    }, [user, userLoading]);

    const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({ control: form.control, name: 'emails' });
    const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({ control: form.control, name: 'phones' });

    async function onSubmit(values: ContactFormData) {
        if (!user) return;
        const cleanedData = Object.fromEntries(Object.entries(values).filter(([_, v]) => v !== undefined));
        try {
            if (isNew) {
                await addContact(firestore, user.uid, cleanedData as any);
                toast({ variant: 'success', title: t('Forms.saveContact') });
            } else {
                await updateContact(firestore, contactId, cleanedData);
                toast({ variant: 'success', title: t('Forms.saveContact') });
            }
            router.push('/contacts');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    if (userLoading || clientsLoading || (contactLoading && !isNew)) {
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }
    
    return (
        <div className="flex flex-1 flex-col">
            <AppHeader title={<div className="flex items-center gap-2"><Link href="/contacts" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.contacts')}</Link><ChevronRight className="h-4 w-4 text-muted-foreground" /><span>{isNew ? t('Forms.addContact') : (contactData?.name || t('Forms.editContact'))}</span></div>} />
            <main className="flex-1 p-4 sm:p-6">
                <div className="mx-auto max-w-2xl">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Card>
                                <CardContent className="space-y-6 p-6">
                                     <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>{t('Forms.contactName')}</FormLabel><FormControl><Input placeholder={t('Forms.contactNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                    <FormField control={form.control} name="clientId" render={({ field }) => (
                                        <FormItem><FormLabel>{t('Pages.clients')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!!clientIdFromQuery}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl>
                                                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <FormField control={form.control} name="position" render={({ field }) => (
                                            <FormItem><FormLabel>{t('Forms.position')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectPosition')} /></SelectTrigger></FormControl><SelectContent>{positionOptions.map((pos) => <SelectItem key={pos} value={pos}>{t(`ContactPositions.${pos}`)}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                        <FormField control={form.control} name="area" render={({ field }) => (
                                            <FormItem><FormLabel>{t('Forms.area')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectArea')} /></SelectTrigger></FormControl><SelectContent>{areaOptions.map((area) => <SelectItem key={area} value={area}>{t(`ContactAreas.${area.replace(' ', '')}`)}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                    </div>
                                    <Separator />
                                    <div className="space-y-4">
                                        <Label>{t('Forms.emails')}</Label>
                                        {emailFields.map((field, index) => (
                                            <div key={field.id} className="flex gap-2">
                                                <FormField control={form.control} name={`emails.${index}.address`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ type: 'work', address: '' })}>{t('Forms.addEmail')}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                             <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>{t('Actions.back')}</Button>
                                <Button type="submit">{t('Forms.saveContact')}</Button>
                             </div>
                        </form>
                    </Form>
                </div>
            </main>
        </div>
    );
}

export default function ContactDetailSuspense() {
    return (
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
            <ContactDetailForm />
        </Suspense>
    );
}
