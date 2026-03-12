
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, UserProfile, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import { addClient, updateClient } from '@/lib/firestore/clients';
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
  FormDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarCropper } from '@/components/profile/avatar-cropper';
import { Building, Camera, Linkedin, Loader2, Wand2, ShieldAlert } from 'lucide-react';
import { findAndFetchLogo } from '@/ai/flows/find-logo-flow';
import { cn } from '@/lib/utils';

const formatCuit = (cuit: string): string => {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.nameMin')),
    holding: z.string().optional(),
    website: z
      .string()
      .url({ message: t('Validation.invalidUrl') })
      .optional()
      .or(z.literal('')),
    linkedinPage: z
      .string()
      .url({ message: t('Validation.invalidUrl') })
      .optional()
      .or(z.literal('')),
    email: z.string().email(t('Validation.invalidEmail')),
    phone: z.string().min(10, t('Validation.phoneMin')),
    cuit: z
      .string()
      .min(1, t('Validation.cuitRequired'))
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 11, {
        message: t('Validation.cuitInvalid'),
      }),
    status: z.enum(['active', 'suspended', 'canceled']),
    sector: z.string().min(1, t('Validation.selectIndustry')),
    subsector: z.string().optional(),
    management: z.string().min(1, t('Validation.fieldRequired')),
    assignedTo: z.string().min(1, t('Validation.fieldRequired')),
    notes: z.string().optional(),
  });

type ClientFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ClientFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();

  const clientId = params.id as string;
  const isNew = clientId === 'new';

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isFindingLogo, setIsFindingLogo] = useState(false);

  // Fetch system config for dynamic dropdowns
  const configDocRef = useMemo(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const clientDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, isNew]);

  const { data: clientData, loading: clientLoading } =
    useDoc<Client>(clientDocRef);

  const { data: allClients } = useCollection<Client>(useMemo(() => (firestore ? collection(firestore, 'clients') : null), [firestore]));
  const { data: allUsers } = useCollection<UserProfile>(useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]));

  const holdings = useMemo(() => {
    if (!allClients) return [];
    const uniqueHoldings = new Set(allClients.map((c) => c.holding).filter(Boolean));
    return Array.from(uniqueHoldings).sort();
  }, [allClients]);

  const ejecutivos = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.role === 'ejecutivo' || u.role === 'admin').sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      holding: '',
      website: '',
      linkedinPage: '',
      email: '',
      phone: '',
      cuit: '',
      status: 'active',
      sector: '',
      subsector: '',
      management: user?.management || 'Satellite Communications',
      assignedTo: user?.uid || '',
      notes: '',
    },
  });

  const watchedSector = form.watch('sector');

  // Filtered subsectors based on hierarchy
  const subsectorOptions = useMemo(() => {
    if (!configData?.subsectors || !watchedSector) return [];
    return configData.subsectors
      .filter(s => s.sector === watchedSector)
      .map(s => s.name)
      .sort();
  }, [configData, watchedSector]);

  // Reset subsector if sector changes and current value is not in new options
  useEffect(() => {
    const currentSubsector = form.getValues('subsector');
    if (currentSubsector && !subsectorOptions.includes(currentSubsector)) {
      form.setValue('subsector', '');
    }
  }, [watchedSector, subsectorOptions, form]);

  useEffect(() => {
    if (clientData) {
      form.reset({
        ...clientData,
        cuit: clientData.cuit ? formatCuit(clientData.cuit) : '',
        website: clientData.website || '',
        linkedinPage: clientData.linkedinPage || '',
        holding: clientData.holding || '',
        notes: clientData.notes || '',
        assignedTo: clientData.assignedTo || '',
        management: clientData.management || 'Satellite Communications',
        sector: clientData.sector || '',
        subsector: clientData.subsector || '',
      });
      setCroppedImage(clientData.logoURL || null);
    }
  }, [clientData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageToCrop(reader.result as string));
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setCroppedImage(croppedImageUrl);
    setImageToCrop(null);
  };

  const handleFindLogo = async () => {
    const websiteUrl = form.getValues('website');
    if (!websiteUrl || !websiteUrl.startsWith('http')) {
      toast({ variant: 'destructive', title: t('Importer.invalidUrlTitle') });
      return;
    }
    setIsFindingLogo(true);
    try {
      const result = await findAndFetchLogo({ websiteUrl });
      if (result.dataUri) {
        setCroppedImage(result.dataUri);
        toast({ variant: 'success', title: t('Importer.logoFound') });
      }
    } finally {
      setIsFindingLogo(false);
    }
  };

  async function onSubmit(values: ClientFormData) {
    if (!user) return;
    try {
      const dataToSave: Partial<Client> = { ...values, logoURL: croppedImage || null };
      if (isNew) {
        await addClient(firestore, user.uid, dataToSave as any);
        toast({ variant: 'success', title: t('Actions.saveSuccess') });
      } else {
        const { cuit, ...updateData } = dataToSave;
        await updateClient(firestore, clientId, updateData);
        toast({ variant: 'success', title: t('Actions.saveSuccess') });
      }
      router.push('/clients');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const isRestricted = user?.role !== 'admin' && user?.role !== 'gerente';

  const statusOptions: Client['status'][] = ['active', 'suspended', 'canceled'];
  
  // Dynamic options from config
  const sectorOptions = (configData?.sectors || []).sort();
  const managementOptions = configData?.managementAreas || ['Satellite Communications', 'GeoInformacion'];

  if (userLoading || (clientLoading && !isNew)) {
    return <div className="p-6"><Skeleton className="h-[70vh] w-full" /></div>;
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader title={isNew ? t('Forms.addClient') : t('Forms.editClient')} />
        <main className="flex-1 p-4 sm:p-6 pb-24">
          <div className="mx-auto max-w-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-32 w-32 rounded-lg">
                          <AvatarImage src={croppedImage || clientData?.logoURL || undefined} />
                          <AvatarFallback className="rounded-lg bg-muted"><Building className="h-16 w-16 text-muted-foreground" /></AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline" size="icon" className="absolute bottom-1 right-1 h-8 w-8 rounded-full">
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            <Camera className="h-4 w-4" />
                            <input id="logo-upload" type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
                          </label>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="management" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Profile.management')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isRestricted}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {managementOptions.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isRestricted && <FormDescription className="text-[10px] flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Solo lectura para ejecutivos</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsable / Ejecutivo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isRestricted}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar ejecutivo..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {ejecutivos.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.clientName')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="website" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.website')}</FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <Input {...field} />
                              <Button type="button" size="icon" variant="ghost" className="absolute right-1 h-8 w-8" onClick={handleFindLogo} disabled={isFindingLogo || !form.watch('website')}><Wand2 className={cn(isFindingLogo && "animate-spin")} /></Button>
                            </div>
                          </FormControl><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="linkedinPage" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.linkedinPage')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl><FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.clientEmail')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.clientPhone')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="cuit" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.cuit')}</FormLabel><FormControl><Input {...field} disabled={!isNew} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.status')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{t(`Status.${s}`)}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="sector" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.sector')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {sectorOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                              {sectorOptions.length === 0 && <SelectItem value="none" disabled>No hay sectores configurados</SelectItem>}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="subsector" render={({ field }) => (
                        <FormItem><FormLabel>{t('Forms.subsector')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchedSector}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {subsectorOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                              {subsectorOptions.length === 0 && <SelectItem value="none" disabled>Seleccione un sector primero</SelectItem>}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.notes')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>{t('Auth.cancelLabel')}</Button>
                  <Button type="submit">{t('Forms.saveClient')}</Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
      <AvatarCropper imageSrc={imageToCrop} onCropComplete={handleCropComplete} onClose={() => setImageToCrop(null)} aspect={1} cropShape="rect" />
    </>
  );
}
