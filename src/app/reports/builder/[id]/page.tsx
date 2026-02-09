'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, Contact, Opportunity, ProductOrService, Report } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { addReport, updateReport } from '@/lib/firestore/reports';
import { useToast } from '@/hooks/use-toast';
import { ReportResultTable } from '@/components/reports/report-result-table';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

type DataSource = 'clients' | 'contacts' | 'opportunities' | 'productsAndServices';

type ReportableField = {
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'array';
  enumValues?: readonly string[];
};

const reportableFields: Record<
  DataSource,
  { header: string; fields: Record<string, ReportableField> }
> = {
  clients: {
    header: 'Reports.dataSources.clients',
    fields: {
      publicId: { label: 'Table.clientId', type: 'string' },
      name: { label: 'Forms.clientName', type: 'string' },
      cuit: { label: 'Forms.cuit', type: 'string' },
      email: { label: 'Forms.clientEmail', type: 'string' },
      phone: { label: 'Forms.clientPhone', type: 'string' },
      website: { label: 'Forms.website', type: 'string' },
      status: { label: 'Table.status', type: 'enum', enumValues: ['active', 'suspended', 'canceled'] },
      industry: { label: 'Table.industry', type: 'string' }, // Could be enum if predefined
      createdAt: { label: 'Table.createdDate', type: 'date' },
    },
  },
  contacts: {
    header: 'Reports.dataSources.contacts',
    fields: {
      publicId: { label: 'Table.contactId', type: 'string' },
      name: { label: 'Forms.contactName', type: 'string' },
      emails: { label: 'Forms.emails', type: 'array' },
      phones: { label: 'Forms.phones', type: 'array' },
      createdAt: { label: 'Table.createdDate', type: 'date' },
    },
  },
  opportunities: {
    header: 'Reports.dataSources.opportunities',
    fields: {
      publicId: { label: 'Table.opportunityId', type: 'string' },
      title: { label: 'Dashboard.recentOpportunities.opportunityHeader', type: 'string' },
      value: { label: 'Dashboard.recentOpportunities.valueHeader', type: 'number' },
      stage: { label: 'Dashboard.recentOpportunities.stageHeader', type: 'enum', enumValues: ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'] },
      probability: { label: 'Forms.probability', type: 'number' },
      closeDate: { label: 'Forms.estCloseDate', type: 'date' },
      contractMonths: { label: 'Forms.contractMonths', type: 'number' },
      requestDate: { label: 'Forms.requestDate', type: 'date' },
      offerSentDate: { label: 'Forms.offerSentDate', type: 'date' },
      isTender: { label: 'Forms.isTender', type: 'boolean' },
      createdAt: { label: 'Table.createdDate', type: 'date' },
    },
  },
  productsAndServices: {
    header: 'Reports.dataSources.ps',
    fields: {
      publicId: { label: 'Table.itemId', type: 'string' },
      name: { label: 'PS.itemName', type: 'string' },
      type: { label: 'Table.type', type: 'enum', enumValues: ['product', 'service'] },
      status: { label: 'Table.status', type: 'enum', enumValues: ['active', 'inactive'] },
      oneTimeCharge: { label: 'Table.oneTimeCharge', type: 'number' },
      recurringCharge: { label: 'Table.recurringCharge', type: 'number' },
      currency: { label: 'Table.currency', type: 'enum', enumValues: ['USD', 'EUR', 'ARS'] },
      createdAt: { label: 'Table.createdDate', type: 'date' },
    }
  }
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(3, t('Reports.validation.nameMin')),
    description: z.string().optional(),
    primaryDataSource: z.enum(['clients', 'contacts', 'opportunities', 'productsAndServices'], {
      required_error: t('Reports.validation.dataSourceRequired'),
    }),
    selectedFields: z.array(z.string()).min(1, t('Reports.validation.fieldsRequired')),
  });

type ReportFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ReportBuilderPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const { toast } = useToast();

  const reportId = params.id as string;
  const isNew = reportId === 'new';
  const shouldRunOnLoad = searchParams.get('run') === 'true';

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState<{ data: any[]; columns: any[] } | null>(null);
  const [filters, setFilters] = useState<any>({});
  const [isFromDatePickerOpen, setFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setToDatePickerOpen] = useState(false);

  const reportDocRef = useMemo(() => {
    if (!user || isNew) return null;
    return doc(firestore, `users/${user.uid}/reports`, reportId);
  }, [firestore, user, reportId, isNew]);

  const { data: existingReport, loading: reportLoading } = useDoc<Report>(reportDocRef);

  // --- Data for generation & filtering ---
  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(
    useMemo(() => baseQuery ? query(collection(firestore, 'clients'), baseQuery) : null, [firestore, baseQuery])
  );
  const { data: contactsData, loading: contactsLoading } = useCollection<Contact>(
     useMemo(() => baseQuery ? query(collection(firestore, 'contacts'), baseQuery) : null, [firestore, baseQuery])
  );
  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(
     useMemo(() => baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null, [firestore, baseQuery])
  );
  const { data: psData, loading: psLoading } = useCollection<ProductOrService>(
    useMemo(() => baseQuery ? query(collection(firestore, 'productsAndServices'), baseQuery) : null, [firestore, baseQuery])
 );

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      selectedFields: [],
    },
  });
  
  useEffect(() => {
    if (existingReport) {
      form.reset({
        name: existingReport.name,
        description: existingReport.description || '',
        primaryDataSource: existingReport.primaryDataSource,
        selectedFields: existingReport.selectedFields,
      });
      // Also restore filters if they are saved
      if (existingReport.filters) {
        setFilters(existingReport.filters);
      }
      if (shouldRunOnLoad) {
        generateReport(existingReport.selectedFields, existingReport.primaryDataSource, existingReport.filters);
      }
    }
  }, [existingReport, shouldRunOnLoad]);


  const watchedDataSource = form.watch('primaryDataSource');
  const watchedSelectedFields = form.watch('selectedFields');

  useEffect(() => {
    // Reset filters when data source changes
    setFilters({});
  }, [watchedDataSource]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  async function handleSave(values: ReportFormData) {
    if (!user) return;
    setIsSaving(true);
    
    const reportData = { ...values, filters };

    try {
      if (isNew) {
        const newReport = await addReport(firestore, user.uid, reportData);
        toast({ variant: 'success', title: t('Reports.saveSuccess') });
        router.replace(`/reports/builder/${newReport.id}`);
      } else {
        await updateReport(firestore, user.uid, reportId, reportData);
        toast({ variant: 'success', title: t('Reports.updateSuccess') });
      }
    } catch (error) {
       toast({ variant: 'destructive', title: t('Reports.saveError') });
    } finally {
        setIsSaving(false);
    }
  }

  function generateReport(fields: string[], dataSource?: DataSource, activeFilters?: any) {
     if (!dataSource) return;
     setIsGenerating(true);
     setReportResult(null);

    setTimeout(() => {
        const clientMap = new Map(clientsData?.map(c => [c.id, c]));
        
        let baseData: any[] = [];
        if (dataSource === 'clients') baseData = clientsData || [];
        if (dataSource === 'contacts') baseData = contactsData || [];
        if (dataSource === 'opportunities') baseData = opportunitiesData || [];
        if (dataSource === 'productsAndServices') baseData = psData || [];

        // Apply filters
        let filteredData = baseData;
        if (activeFilters) {
          filteredData = baseData.filter(item => {
            return Object.entries(activeFilters).every(([key, value]) => {
              if (value === '' || value === null || value === undefined) return true;
              if (key === 'text') {
                return item.name?.toLowerCase().includes(String(value).toLowerCase()) || 
                       item.title?.toLowerCase().includes(String(value).toLowerCase());
              }
              if (key === 'fromDate' && item.createdAt) {
                return new Date(item.createdAt) >= new Date(value as string);
              }
              if (key === 'toDate' && item.createdAt) {
                return new Date(item.createdAt) <= new Date(value as string);
              }
              return item[key] === value;
            });
          });
        }
      
        const newColumns = fields.map(fieldKey => {
            const [source, field] = fieldKey.split('.');
            const sourceName = source as keyof typeof reportableFields;
            const fieldName = field as keyof typeof reportableFields[typeof sourceName]['fields'];
            return { accessorKey: fieldKey, header: t(reportableFields[sourceName].fields[fieldName].label) };
        });

        const newData = filteredData.map(primaryRecord => {
          const row: Record<string, any> = {};
          
          let client: Client | undefined;
          let contact: Contact | undefined;
          let opportunity: Opportunity | undefined;
          let product: ProductOrService | undefined;

          if (dataSource === 'opportunities') {
            opportunity = primaryRecord;
            if (opportunity) client = clientMap.get(opportunity.clientId);
          } else if (dataSource === 'contacts') {
             contact = primaryRecord;
             if (contact) client = clientMap.get(contact.clientId);
          } else if (dataSource === 'clients') {
             client = primaryRecord;
          } else if (dataSource === 'productsAndServices') {
             product = primaryRecord;
          }
          
          for (const fieldKey of fields) {
            const [source, field] = fieldKey.split('.');
            let value;
            if (source === 'clients' && client) value = (client as any)[field];
            if (source === 'contacts' && contact) value = (contact as any)[field];
            if (source === 'opportunities' && opportunity) value = (opportunity as any)[field];
            if (source === 'productsAndServices' && product) value = (product as any)[field];
            
             if (fieldKey === 'contacts.name' && opportunity?.contactId) {
                value = contactsData?.find(c => c.id === opportunity.contactId)?.name;
            }

            row[fieldKey] = value;
          }

          return row;
        });

        setReportResult({ data: newData, columns: newColumns });
        setIsGenerating(false);
     }, 500);
  }

  const handleFieldToggle = (fieldKey: string, source: DataSource) => {
    const currentFields = form.getValues('selectedFields');
    const newFields = currentFields.includes(fieldKey)
      ? currentFields.filter(f => f !== fieldKey)
      : [...currentFields, fieldKey];
    
    form.setValue('selectedFields', newFields, { shouldValidate: true });
  };
  
  const pageIsLoading = userLoading || reportLoading || clientsLoading || contactsLoading || opportunitiesLoading || psLoading;
  
  if (pageIsLoading && !isNew) {
    return <div className="flex-1 p-6"><Skeleton className="h-96 w-full" /></div>
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const renderFilters = () => {
    if (!watchedDataSource) return null;

    const sourceFields = reportableFields[watchedDataSource].fields;
    const hasField = (name: string) => Object.keys(sourceFields).includes(name);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Reports.step4')}</CardTitle>
                <CardDescription>{t('Reports.filtersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(hasField('name') || hasField('title')) && (
                    <FormItem>
                        <FormLabel>{t('Table.filterByName')}</FormLabel>
                        <Input value={filters.text || ''} onChange={e => handleFilterChange('text', e.target.value)} />
                    </FormItem>
                )}
                {hasField('status') && (
                    <FormItem>
                         <FormLabel>{t('Table.status')}</FormLabel>
                         <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? undefined : value)}>
                            <SelectTrigger><SelectValue placeholder={t('Table.all')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('Table.all')}</SelectItem>
                                {(sourceFields.status.enumValues || []).map(val => (
                                    <SelectItem key={val} value={val}>{t(`Status.${val}`)}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </FormItem>
                )}
                 {hasField('stage') && (
                    <FormItem>
                         <FormLabel>{t('Table.status')}</FormLabel>
                         <Select value={filters.stage} onValueChange={value => handleFilterChange('stage', value === 'all' ? undefined : value)}>
                            <SelectTrigger><SelectValue placeholder={t('Table.all')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('Table.all')}</SelectItem>
                                {(sourceFields.stage.enumValues || []).map(val => (
                                    <SelectItem key={val} value={val}>{t(`Stages.${val}`)}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </FormItem>
                )}
                 {hasField('type') && (
                    <FormItem>
                         <FormLabel>{t('Table.type')}</FormLabel>
                         <Select value={filters.type} onValueChange={value => handleFilterChange('type', value === 'all' ? undefined : value)}>
                            <SelectTrigger><SelectValue placeholder={t('Table.all')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('Table.all')}</SelectItem>
                                {(sourceFields.type.enumValues || []).map(val => (
                                    <SelectItem key={val} value={val}>{t(`PS.${val}`)}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </FormItem>
                )}
                {hasField('createdAt') && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormItem>
                       <FormLabel>{t('Reports.from')}</FormLabel>
                       <Popover open={isFromDatePickerOpen} onOpenChange={setFromDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.fromDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.fromDate ? format(new Date(filters.fromDate), 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={filters.fromDate ? new Date(filters.fromDate) : undefined} onSelect={date => { handleFilterChange('fromDate', date); setFromDatePickerOpen(false); }} initialFocus />
                          </PopoverContent>
                        </Popover>
                    </FormItem>
                    <FormItem>
                       <FormLabel>{t('Reports.to')}</FormLabel>
                       <Popover open={isToDatePickerOpen} onOpenChange={setToDatePickerOpen}>
                          <PopoverTrigger asChild>
                           <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.toDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.toDate ? format(new Date(filters.toDate), 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={filters.toDate ? new Date(filters.toDate) : undefined} onSelect={date => { handleFilterChange('toDate', date); setToDatePickerOpen(false); }} initialFocus />
                          </PopoverContent>
                        </Popover>
                    </FormItem>
                  </div>
                )}
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
       <AppHeader title={isNew ? t('Reports.createNew') : t('Actions.editReport')} />
       <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('Reports.step1')}</CardTitle>
                        <CardDescription>{t('Reports.step1Desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>{t('Reports.reportName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>{t('Reports.reportDescription')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                    </CardContent>
                 </Card>
                 
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('Reports.step2')}</CardTitle>
                        <CardDescription>{t('Reports.step2Desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="primaryDataSource" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('Reports.dataSource')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="w-full md:w-1/3"><SelectValue placeholder={t('Reports.selectDataSource')} /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="opportunities">{t('Reports.dataSources.opportunities')}</SelectItem>
                                        <SelectItem value="clients">{t('Reports.dataSources.clients')}</SelectItem>
                                        <SelectItem value="contacts">{t('Reports.dataSources.contacts')}</SelectItem>
                                        <SelectItem value="productsAndServices">{t('Reports.dataSources.ps')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                         )} />
                    </CardContent>
                 </Card>
                 
                {watchedDataSource && (
                     <Card>
                        <CardHeader>
                            <CardTitle>{t('Reports.step3')}</CardTitle>
                             <CardDescription>{t('Reports.step3Desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(reportableFields).map(([source, group]) => {
                                const isPrimary = source === watchedDataSource;
                                let isRelatedAvailable = false;
                                if (watchedDataSource === 'opportunities' && (source === 'clients' || source === 'contacts')) isRelatedAvailable = true;
                                if (watchedDataSource === 'contacts' && source === 'clients') isRelatedAvailable = true;
                                
                                if (!isPrimary && !isRelatedAvailable) return null;

                                return (
                                <div key={source}>
                                    <h4 className="mb-2 text-md font-semibold flex items-center gap-2">
                                        {t(group.header)} 
                                        {isPrimary && <Badge>{t('Reports.primary')}</Badge>}
                                        {isRelatedAvailable && <Badge variant="secondary">{t('Reports.related')}</Badge>}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4 lg:grid-cols-5">
                                    {Object.entries(group.fields).map(([field, fieldConfig]) => {
                                        const fieldKey = `${source}.${field}`;
                                        return (
                                            <div key={fieldKey} className="flex items-center space-x-2">
                                                <Checkbox
                                                id={fieldKey}
                                                checked={watchedSelectedFields.includes(fieldKey)}
                                                onCheckedChange={() => handleFieldToggle(fieldKey, source as DataSource)}
                                                />
                                                <Label htmlFor={fieldKey} className="font-normal">{t(fieldConfig.label)}</Label>
                                            </div>
                                        )
                                    })}
                                    </div>
                                </div>
                            )})}
                            <FormMessage>{form.formState.errors.selectedFields?.message}</FormMessage>
                        </CardContent>
                    </Card>
                )}

                {watchedDataSource && renderFilters()}

                <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.push('/reports')}>{t('Auth.cancelLabel')}</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : t('Reports.saveReport')}</Button>
                    <Button type="button" onClick={() => generateReport(form.getValues('selectedFields'), form.getValues('primaryDataSource'), filters)} disabled={isGenerating || watchedSelectedFields.length === 0}>
                        {isGenerating ? <Loader2 className="animate-spin" /> : t('Reports.generateReport')}
                    </Button>
                </div>
            </form>
        </Form>
        
        {isGenerating && <Skeleton className="h-64 w-full mt-8" />}
        {reportResult && <ReportResultTable columns={reportResult.columns} data={reportResult.data} />}
        </div>
       </main>
    </div>
  );
}
