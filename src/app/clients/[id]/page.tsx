'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, UserProfile, SystemConfig, TaxIdType } from '@/lib/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarCropper } from '@/components/profile/avatar-cropper';
import { Building, Camera, Linkedin, Loader2, Wand2, ShieldAlert, ChevronRight, ExternalLink, Key, BadgeInfo, PhoneCall, Globe, Briefcase, Tag, Hash, Search } from 'lucide-react';
import { findAndFetchLogo } from '@/ai/flows/find-logo-flow';
import { fetchTaxIdFromLegalName, fetchLegalNameFromTaxId } from '@/ai/flows/company-info-flow';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.nameMin')),
    legalName: z.string().optional().or(z.literal('')),
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
    taxIdType: z.enum(['CUIT', 'RUT_CL', 'RUC_PE', 'CNPJ', 'RUT_CO', 'NIT_CR', 'EIN_US', 'OTHER']),
    cuit: z
      .string()
      .min(1, t('Validation.cuitRequired')),
    clientePresea: z.string().length(3, t('Validation.preseaInvalid')).optional().or(z.literal('')),
    status: z.enum(['active', 'suspended', 'canceled']),
    type: z.enum(['client', 'prospect']),
    sector: z.string().min(1, t('Validation.selectIndustry')),
    subsector: z.string().optional().or(z.literal('')),
    management: z.string().min(1, t('Validation.fieldRequired')),
    assignedTo: z.string().min(1, t('Validation.fieldRequired')),
    notes: z.string().optional(),
    countryHQ: z.string().optional(),
    costCenterId: z.string().optional(),
    supplierPortalUrl: z.string().url({ message: t('Validation.invalidUrl') }).optional().or(z.literal('')),
    supplierPortalUser: z.string().optional(),
    supplierPortalPassword: z.string().optional(),
  }).superRefine((data, ctx) => {
    const cleanId = data.cuit.replace(/\D/g, '');
    
    if (data.taxIdType === 'CUIT' && cleanId.length !== 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('Validation.cuitInvalid'), path: ['cuit'] });
    } else if (data.taxIdType === 'CNPJ' && cleanId.length !== 14) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('Validation.taxIdInvalid'), path: ['cuit'] });
    } else if (data.taxIdType === 'RUC_PE' && cleanId.length !== 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('Validation.taxIdInvalid'), path: ['cuit'] });
    } else if (data.taxIdType === 'EIN_US' && cleanId.length !== 9) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('Validation.taxIdInvalid'), path: ['cuit'] });
    }
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
  const isInitialLoad = useRef(true);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedAvatar] = useState<string | null>(null);
  const [isFindingLogo, setIsFindingLogo] = useState(false);
  const [isFindingTaxId, setIsFindingTaxId] = useState(false);
  const [isFindingLegalName, setIsFindingLegalName] = useState(false);

  // Fetch system config for dynamic dropdowns
  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
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
      legalName: '',
      holding: '',
      website: '',
      linkedinPage: '',
      email: '',
      phone: '',
      taxIdType: 'CUIT',
      cuit: '',
      clientePresea: '',
      status: 'active',
      type: 'client',
      sector: '',
      subsector: '',
      management: user?.management || 'Satellite Communications',
      assignedTo: user?.uid || '',
      notes: '',
      countryHQ: '',
      costCenterId: '',
      supplierPortalUrl: '',
      supplierPortalUser: '',
      supplierPortalPassword: '',
    },
  });

  const watchedSector = form.watch('sector');
  const watchedPortalUrl = form.watch('supplierPortalUrl');
  const watchedTaxIdType = form.watch('taxIdType');

  // Filtered subsectors based on hierarchy
  const subsectorOptions = useMemo(() => {
    if (!configData?.subsectors || !watchedSector) return [];
    return configData.subsectors
      .filter(s => s.sector === watchedSector)
      .map(s => s.name)
      .sort();
  }, [configData, watchedSector]);

  // Reset subsector if sector changes (Only when not initial loading)
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    const currentSubsector = form.getValues('subsector');
    if (currentSubsector && !subsectorOptions.includes(currentSubsector)) {
      form.setValue('subsector', '');
    }
  }, [watchedSector, subsectorOptions, form]);

  useEffect(() => {
    if (clientData && isInitialLoad.current) {
      form.reset({
        ...clientData,
        legalName: clientData.legalName || '',
        cuit: clientData.cuit || '',
        taxIdType: clientData.taxIdType || 'CUIT',
        clientePresea: clientData.clientePresea || '',
        website: clientData.website || '',
        linkedinPage: clientData.linkedinPage || '',
        holding: clientData.holding || '',
        notes: clientData.notes || '',
        assignedTo: clientData.assignedTo || '',
        management: clientData.management || 'Satellite Communications',
        sector: clientData.sector || '',
        subsector: clientData.subsector || '',
        countryHQ: clientData.countryHQ || '',
        costCenterId: clientData.costCenterId || '',
        type: clientData.type || 'client',
        supplierPortalUrl: clientData.supplierPortalUrl || '',
        supplierPortalUser: clientData.supplierPortalUser || '',
        supplierPortalPassword: clientData.supplierPortalPassword || '',
      });
      setCroppedAvatar(clientData.logoURL || null);
      
      // Mark initial load as complete after a small delay to let options populate
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    } else if (isNew && user && isInitialLoad.current) {
      // For new clients, ensure executive and management are set correctly once user is loaded
      form.setValue('assignedTo', user.uid);
      form.setValue('management', user.management || 'Satellite Communications');
      isInitialLoad.current = false;
    }
  }, [clientData, form, isNew, user]);

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
    setCroppedAvatar(croppedImageUrl);
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
        setCroppedAvatar(result.dataUri);
        toast({ variant: 'success', title: t('Importer.logoFound') });
      }
    } finally {
      setIsFindingLogo(false);
    }
  };

  const handleFindTaxId = async () => {
    const legalName = form.getValues('legalName') || form.getValues('name');
    if (!legalName || legalName.length < 3) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese una Razón Social o Nombre válido primero.' });
      return;
    }
    setIsFindingTaxId(true);
    try {
      const result = await fetchTaxIdFromLegalName({ legalName });
      if (result.taxId) {
        form.setValue('cuit', result.taxId, { shouldValidate: true });
        toast({ variant: 'success', title: 'Éxito', description: 'ID Tributario encontrado' });
      } else if (result.error) {
        let msg = result.error;
        if (msg.includes('429') || msg.includes('credits are depleted')) {
          msg = "Créditos de IA agotados. Por favor revise su facturación en AI Studio.";
        }
        toast({ variant: 'destructive', title: 'Error de IA', description: msg });
      } else {
        toast({ variant: 'destructive', title: 'No encontrado', description: 'No se pudo encontrar el ID Tributario' });
      }
    } finally {
      setIsFindingTaxId(false);
    }
  };

  const handleFindLegalName = async () => {
    const taxId = form.getValues('cuit');
    if (!taxId || taxId.length < 5) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese un ID Tributario válido primero.' });
      return;
    }
    setIsFindingLegalName(true);
    try {
      const result = await fetchLegalNameFromTaxId({ taxId });
      if (result.legalName) {
        form.setValue('legalName', result.legalName, { shouldValidate: true });
        toast({ variant: 'success', title: 'Éxito', description: 'Razón Social encontrada' });
      } else if (result.error) {
        let msg = result.error;
        if (msg.includes('429') || msg.includes('credits are depleted')) {
          msg = "Créditos de IA agotados. Por favor revise su facturación en AI Studio.";
        }
        toast({ variant: 'destructive', title: 'Error de IA', description: msg });
      } else {
        toast({ variant: 'destructive', title: 'No encontrado', description: 'No se pudo encontrar la Razón Social' });
      }
    } finally {
      setIsFindingLegalName(false);
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
        await updateClient(firestore, clientId, dataToSave);
        toast({ variant: 'success', title: t('Actions.saveSuccess') });
      }
      router.push('/clients');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const isRestricted = user?.role !== 'admin' && user?.role !== 'gerente';

  const statusOptions: Client['status'][] = ['active', 'suspended', 'canceled'];
  const typeOptions: Client['type'][] = ['client', 'prospect'];
  const taxIdTypeOptions: TaxIdType[] = ['CUIT', 'RUT_CL', 'RUC_PE', 'CNPJ', 'RUT_CO', 'NIT_CR', 'EIN_US', 'OTHER'];
  
  const sectorOptions = (configData?.sectors || []).sort();
  const managementOptions = configData?.managementAreas || ['Satellite Communications', 'GeoInformacion'];
  const costCenterOptions = configData?.costCenters || [];

  const countryOptions = [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'CostaRica', 'Cuba', 
    'DominicanRepublic', 'Ecuador', 'ElSalvador', 'Guatemala', 'Honduras', 
    'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'PuertoRico', 
    'Uruguay', 'Venezuela', 'USA', 'Canada', 'Bahamas', 'Barbados', 'Belize', 
    'Guyana', 'Suriname', 'TrinidadAndTobago', 'Spain', 'UK', 'Germany', 
    'France', 'Italy', 'Switzerland', 'Netherlands', 'SouthAfrica', 'Nigeria', 
    'Egypt', 'China', 'Japan', 'India', 'SouthKorea', 'UAE'
  ].sort((a, b) => t(`Countries.${a}`).localeCompare(t(`Countries.${b}`)));

  const getTaxIdPlaceholder = (type: TaxIdType) => {
    switch (type) {
      case 'CUIT': return '20-12345678-9';
      case 'CNPJ': return '12.345.678/0001-90';
      case 'RUT_CL': return '12.345.678-9';
      case 'EIN_US': return '12-3456789';
      default: return 'ID...';
    }
  }

  if (userLoading || (clientLoading && !isNew)) {
    return <div className="p-6"><Skeleton className="h-[70vh] w-full" /></div>;
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader title={
          <div className="flex items-center gap-2">
            <Link href="/clients" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.clients')}</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span>{isNew ? t('Forms.addClient') : (clientData?.name || t('Forms.editClient'))}</span>
          </div>
        } />
        <main className="flex-1 p-4 sm:p-6 pb-24">
          <div className="mx-auto max-w-3xl space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* SECCION 1: IDENTIDAD COMERCIAL */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <BadgeInfo className="h-4 w-4 text-primary" /> Identidad Comercial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                      <div className="relative">
                        <Avatar className="h-32 w-32 rounded-lg border-2 border-slate-100 shadow-inner bg-slate-50">
                          <AvatarImage src={croppedImage || clientData?.logoURL || undefined} />
                          <AvatarFallback className="rounded-lg"><Building className="h-12 w-12 text-slate-300" /></AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline" size="icon" className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg bg-white">
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            <Camera className="h-5 w-5 text-primary" />
                            <input id="logo-upload" type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
                          </label>
                        </Button>
                      </div>
                      
                      <div className="flex-1 w-full space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Forms.clientName')}</FormLabel>
                              <FormControl><Input placeholder="Nombre Comercial" {...field} className="bg-slate-50/50" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="legalName" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Forms.legalName')}</FormLabel>
                              <FormControl>
                                <div className="relative flex items-center">
                                  <Input placeholder="Razón Social Completa" {...field} className="bg-slate-50/50 pr-10" />
                                  <Button type="button" size="icon" variant="ghost" title="Completar con IA basado en el ID Tributario" className="absolute right-1 h-8 w-8 text-primary" onClick={handleFindLegalName} disabled={isFindingLegalName || !form.watch('cuit')}>
                                    {isFindingLegalName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="taxIdType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Forms.taxIdType')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{taxIdTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{t(`TaxIdTypes.${opt}`)}</SelectItem>)}</SelectContent>
                              </Select><FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="cuit" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Forms.cuit')}</FormLabel>
                              <FormControl>
                                <div className="relative flex items-center">
                                    <Input {...field} placeholder={getTaxIdPlaceholder(watchedTaxIdType)} className="bg-slate-50/50 pr-10" />
                                    <Button type="button" size="icon" variant="ghost" title="Buscar ID con IA basado en Nombre Comercial o Razón Social" className="absolute right-1 h-8 w-8 text-primary" onClick={handleFindTaxId} disabled={isFindingTaxId || (!form.watch('legalName') && !form.watch('name'))}>
                                        {isFindingTaxId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="clientePresea" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Hash className="h-3 w-3" />
                                {t('Forms.clientePresea')}
                              </FormLabel>
                              <FormControl><Input {...field} placeholder="000" maxLength={3} className="bg-slate-50/50 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField control={form.control} name="management" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Profile.management')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isRestricted}>
                            <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{managementOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsable</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isRestricted}>
                            <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>{ejecutivos.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Table.type')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{typeOptions.map(opt => <SelectItem key={opt} value={opt}>{t(`ClientType.${opt}`)}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Forms.status')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className={cn("bg-slate-50/50 font-bold", field.value === 'active' ? "text-green-600" : "text-slate-600")}><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{t(`Status.${s}`)}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* SECCION 2: CATEGORIZACION Y ESTRUCTURA */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" /> Categorización y Estructura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="sector" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.sector')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                          <SelectContent>{sectorOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="subsector" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.subsector')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!watchedSector}>
                          <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger></FormControl>
                          <SelectContent>{subsectorOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="holding" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Forms.holding')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} list="holdings-list" placeholder={t('Forms.holdingPlaceholder')} className="bg-slate-50/50" />
                            <datalist id="holdings-list">
                              {holdings.map(h => <option key={h} value={h} />)}
                            </datalist>
                          </div>
                        </FormControl><FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="countryHQ" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Forms.countryHQ')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                            <SelectContent>{countryOptions.map(c => <SelectItem key={c} value={c}>{t(`Countries.${c}`)}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="costCenterId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Forms.costCenter')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-slate-50/50"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {costCenterOptions.map(cc => (
                                <SelectItem key={cc.id} value={cc.id}>
                                  <span className="text-[10px] uppercase font-bold">{cc.id} - {cc.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* SECCION 3: CONTACTO Y CANALES DIGITALES */}
                <Card className="border-none shadow-md">
                  <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-primary" /> Contacto y Digital
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>{t('Auth.emailLabel')}</FormLabel><FormControl><Input placeholder="ejemplo@empresa.com" {...field} className="bg-slate-50/50" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>{t('Auth.phoneLabel')}</FormLabel><FormControl><Input placeholder="+54..." {...field} className="bg-slate-50/50" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="website" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-2"><Globe className="h-3 w-3" /> {t('Forms.website')}</FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <Input placeholder="https://..." {...field} className="bg-slate-50/50" />
                              <Button type="button" size="icon" variant="ghost" className="absolute right-1 h-8 w-8 text-primary" onClick={handleFindLogo} disabled={isFindingLogo || !form.watch('website')}><Wand2 className={cn(isFindingLogo && "animate-spin")} /></Button>
                            </div>
                          </FormControl><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="linkedinPage" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-2"><Linkedin className="h-3 w-3 text-blue-700" /> LinkedIn</FormLabel>
                          <FormControl><Input placeholder="https://linkedin.com/..." {...field} className="bg-slate-50/50" /></FormControl><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>{t('Forms.notes')}</FormLabel><FormControl><Textarea placeholder="Observaciones generales..." {...field} className="bg-slate-50/50 min-h-[100px]" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* SECCION 4: PORTAL DE PROVEEDORES */}
                <Card className="border-primary/20 bg-primary/5 shadow-inner">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-primary" />
                      {t('Forms.supplierPortalUrl')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="supplierPortalUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Input {...field} placeholder="https://portal.cliente.com" className="bg-white border-primary/20" />
                            {watchedPortalUrl && (
                              <Button asChild type="button" size="icon" variant="ghost" className="absolute right-1 h-8 w-8">
                                <a href={watchedPortalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {watchedPortalUrl && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <FormField control={form.control} name="supplierPortalUser" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Key className="h-3 w-3" /> {t('Forms.supplierPortalUser')}</FormLabel>
                            <FormControl><Input {...field} className="bg-white border-primary/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="supplierPortalPassword" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><ShieldAlert className="h-3 w-3" /> {t('Forms.supplierPortalPassword')}</FormLabel>
                            <FormControl><Input {...field} type="password" className="bg-white border-primary/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="h-12 px-8">{t('Auth.cancelLabel')}</Button>
                  <Button type="submit" size="lg" className="h-12 px-12 shadow-lg">{t('Forms.saveClient')}</Button>
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
