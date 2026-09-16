'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type { Contact, Client, EmailEntry, PhoneEntry, ContactPosition, ContactArea, ContactSource } from '@/lib/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ArrowLeft, ChevronRight, User, Mail, Phone, Calendar as CalendarIcon, Link2, MessageSquare, ShieldCheck, BadgeInfo, Plus, Save, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const positionOptions: ContactPosition[] = ['Analyst', 'CEO', 'CFO', 'CIO', 'CISO', 'Head', 'Manager'];
const areaOptions: ContactArea[] = ['Administration', 'IT', 'Legal', 'Marketing', 'Procurement', 'Sales', 'Supplier Payments'];
const sourceOptions: ContactSource[] = ['Directo', 'LinkedIn', 'Referido'];
const statusOptions = ['active', 'suspended', 'canceled'];

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
          number: z.string().min(8, t('Validation.phoneMin')),
        })
      )
      .optional(),
    notes: z.string().optional(),
    source: z.enum(sourceOptions).optional(),
    linkedinProfile: z.string().url().optional().or(z.literal('')),
    birthDate: z.date().optional().nullable(),
    hasWhatsapp: z.boolean().default(false),
    isContactable: z.boolean().default(true),
    status: z.enum(['active', 'suspended', 'canceled']).default('active'),
  });

type ContactFormData = z.infer<ReturnType<typeof getFormSchema>>;

function ContactDetailForm() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { t, locale } = useI18n();
    const { toast } = useToast();
    const dateLocale = locale === 'es' ? es : enUS;

    const contactId = params.id as string;
    const isNew = contactId === 'new';
    const clientIdFromQuery = searchParams.get('clientId');

    const [isBirthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const contactDocRef = useMemo(() => {
        if (!firestore || isNew) return null;
        return doc(firestore, 'contacts', contactId);
    }, [firestore, contactId, isNew]);
    const { data: contactData, loading: contactLoading } = useDoc<Contact>(contactDocRef);

    const clientsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      const ref = collection(firestore, 'clients');
      if (user.role === 'admin') return query(ref);
      return query(ref, where('management', '==', user.management));
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
            source: 'Directo',
            linkedinProfile: '',
            birthDate: null,
            hasWhatsapp: false,
            isContactable: true,
            status: 'active',
        },
    });

    useEffect(() => {
        if (contactData) {
            form.reset({
              ...contactData,
              birthDate: contactData.birthDate ? new Date(contactData.birthDate) : null,
              emails: contactData.emails?.length ? contactData.emails : [{ type: 'work', address: '' }],
              phones: contactData.phones?.length ? contactData.phones : [{ type: 'mobile', number: '' }],
            });
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
        setIsSaving(true);
        try {
            if (isNew) {
                await addContact(firestore, user.uid, values as any);
                toast({ variant: 'success', title: t('Forms.saveContact') });
            } else {
                await updateContact(firestore, contactId, values);
                toast({ variant: 'success', title: t('Forms.saveContact') });
            }
            router.push('/contacts');
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    }

    if (userLoading || clientsLoading || (contactLoading && !isNew)) {
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }
    
    return (
        <div className="flex flex-1 flex-col">
            <AppHeader title={<div className="flex items-center gap-2"><Link href="/contacts" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.contacts')}</Link><ChevronRight className="h-4 w-4 text-muted-foreground" /><span>{isNew ? t('Forms.addContact') : (contactData?.name || t('Forms.editContact'))}</span></div>}>
              <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
            </AppHeader>
            <main className="flex-1 p-4 sm:p-6 pb-24">
                <div className="mx-auto max-w-4xl space-y-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            <Card className="border-none shadow-md">
                                <CardHeader className="bg-slate-50 border-b">
                                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <BadgeInfo className="h-4 w-4 text-primary" /> Identidad y Empresa
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="name" render={({ field }) => (
                                          <FormItem><FormLabel>{t('Forms.contactName')} <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder={t('Forms.contactNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="clientId" render={({ field }) => (
                                            <FormItem><FormLabel>{t('Pages.clients')} <span className="text-red-500">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!!clientIdFromQuery || !isNew}>
                                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('Forms.selectClient')} /></SelectTrigger></FormControl>
                                                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select><FormMessage />
                                            </FormItem>
                                        )} />
                                     </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                        <FormField control={form.control} name="position" render={({ field }) => (
                                            <FormItem><FormLabel>{t('Forms.position')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('Forms.selectPosition')} /></SelectTrigger></FormControl><SelectContent>{positionOptions.map((pos) => <SelectItem key={pos} value={pos}>{t(`ContactPositions.${pos}`)}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                        <FormField control={form.control} name="area" render={({ field }) => (
                                            <FormItem><FormLabel>{t('Forms.area')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('Forms.selectArea')} /></SelectTrigger></FormControl><SelectContent>{areaOptions.map((area) => <SelectItem key={area} value={area}>{t(`ContactAreas.${area.replace(' ', '')}`)}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                        <FormField control={form.control} name="status" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>{t('Forms.status')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl><SelectTrigger className="bg-white font-bold"><SelectValue /></SelectTrigger></FormControl>
                                              <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{t(`Status.${s}`)}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md">
                                <CardHeader className="bg-slate-50 border-b">
                                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" /> Canales de Contacto
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-xs font-black uppercase text-slate-500 tracking-tighter">{t('Forms.emails')}</Label>
                                          <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ type: 'work', address: '' })} className="h-7 text-[10px] uppercase font-bold">
                                            <Plus className="h-3 w-3 mr-1" />{t('Forms.addEmail')}
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          {emailFields.map((field, index) => (
                                              <div key={field.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                                  <FormField control={form.control} name={`emails.${index}.type`} render={({ field }) => (
                                                    <FormItem className="w-32">
                                                      <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="bg-white h-8 text-[11px]"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                          {['work', 'personal', 'other'].map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                                                        </SelectContent>
                                                      </Select>
                                                    </FormItem>
                                                  )} />
                                                  <FormField control={form.control} name={`emails.${index}.address`} render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                      <FormControl><Input {...field} className="h-8 bg-white text-[11px]" placeholder="email@dominio.com" /></FormControl>
                                                      <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                  )} />
                                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEmail(index)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                              </div>
                                          ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-xs font-black uppercase text-slate-500 tracking-tighter">{t('Forms.phones')}</Label>
                                          <Button type="button" variant="outline" size="sm" onClick={() => appendPhone({ type: 'mobile', number: '' })} className="h-7 text-[10px] uppercase font-bold">
                                            <Plus className="h-3 w-3 mr-1" />{t('Forms.addPhone')}
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          {phoneFields.map((field, index) => (
                                              <div key={field.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                                  <FormField control={form.control} name={`phones.${index}.type`} render={({ field }) => (
                                                    <FormItem className="w-32">
                                                      <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="bg-white h-8 text-[11px]"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                          {['mobile', 'landline', 'work', 'home'].map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                                                        </SelectContent>
                                                      </Select>
                                                    </FormItem>
                                                  )} />
                                                  <FormField control={form.control} name={`phones.${index}.number`} render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                      <FormControl><Input {...field} className="h-8 bg-white text-[11px]" placeholder="+54..." /></FormControl>
                                                      <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                  )} />
                                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePhone(index)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                              </div>
                                          ))}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                                       <FormField control={form.control} name="hasWhatsapp" render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                                            <div className="space-y-0.5"><FormLabel className="text-xs font-bold uppercase flex items-center gap-2"><MessageSquare className="h-3 w-3 text-green-600" /> {t('Forms.hasWhatsapp')}</FormLabel></div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                          </FormItem>
                                       )} />
                                       <FormField control={form.control} name="isContactable" render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                                            <div className="space-y-0.5"><FormLabel className="text-xs font-bold uppercase flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-blue-600" /> {t('Forms.isContactable')}</FormLabel></div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                          </FormItem>
                                       )} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md">
                                <CardHeader className="bg-slate-50 border-b">
                                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" /> Información Adicional
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="source" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>{t('Forms.source')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                              <SelectContent>{sourceOptions.map(opt => <SelectItem key={opt} value={opt}>{t(`ContactSources.${opt}`)}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                        <FormField control={form.control} name="linkedinProfile" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Link2 className="h-3 w-3 text-blue-700" /> {t('Forms.linkedinProfile')}</FormLabel>
                                            <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                                          <FormItem className="flex flex-col">
                                            <FormLabel>{t('Forms.birthDate')}</FormLabel>
                                            <Popover open={isBirthDatePickerOpen} onOpenChange={setBirthDatePickerOpen}>
                                              <PopoverTrigger asChild>
                                                <FormControl>
                                                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal bg-white", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                  </Button>
                                                </FormControl>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar 
                                                  mode="single" 
                                                  selected={field.value || undefined} 
                                                  onSelect={(date) => {
                                                    field.onChange(date);
                                                    setBirthDatePickerOpen(false);
                                                  }}
                                                  initialFocus 
                                                  captionLayout="dropdown" 
                                                  startMonth={new Date(1940, 0)} 
                                                  endMonth={new Date()} 
                                                  locale={dateLocale}
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          </FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="notes" render={({ field }) => (
                                      <FormItem><FormLabel>{t('Forms.notes')}</FormLabel><FormControl><Textarea className="min-h-[100px] resize-none" {...field} placeholder="Intereses, preferencias de contacto, etc..." /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                             <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>{t('Auth.cancelLabel')}</Button>
                                <Button type="submit" disabled={isSaving}>
                                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                  {t('Forms.saveContact')}
                                </Button>
                             </div>
                        </form>
                    </Form>
                </div>
            </main>
        </div>
    );
}

export function ContactDetailSuspense() {
    return (
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
            <ContactDetailForm />
        </Suspense>
    );
}

export default ContactDetailSuspense;