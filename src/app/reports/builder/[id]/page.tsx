'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, Contact, Opportunity, ProductOrService, Report, ReportFilter, ReportSort } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Calendar as CalendarIcon, Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { nanoid } from 'nanoid';
import { Badge } from '@/components/ui/badge';

type DataSource = 'clients' | 'contacts' | 'opportunities' | 'productsAndServices';

type ReportableField = {
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'array';
  enumValues?: readonly string[];
  isRelational?: boolean;
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
      // Relational
      'client.name': { label: "Client's Name", type: 'string', isRelational: true },
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
      // Relational
      'client.name': { label: "Client's Name", type: 'string', isRelational: true },
      'contact.name': { label: "Contact's Name", type: 'string', isRelational: true },
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
    filters: z.array(z.object({
      id: z.string(),
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })).optional(),
    sorting: z.array(z.object({
      id: z.string(),
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    })).optional(),
  });

type ReportFormData = z.infer<ReturnType<typeof getFormSchema>>;

const operatorsByType = {
  string: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'not_contains', label: 'not contains' },
    { value: 'not_equals', label: 'not equals' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '!=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
  ],
  date: [
    { value: 'eq', label: 'on' },
    { value: 'neq', label: 'not on' },
    { value: 'gt', label: 'after' },
    { value: 'lt', label: 'before' },
  ],
  enum: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'in', label: 'is one of' },
  ],
  boolean: [
    { value: 'is', label: 'is' }
  ]
};

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

  const reportDocRef = useMemo(() => {
    if (!user || isNew) return null;
    return doc(firestore, `users/${user.uid}/reports`, reportId);
  }, [firestore, user, reportId, isNew]);

  const { data: existingReport, loading: reportLoading } = useDoc<Report>(reportDocRef);

  const baseQuery = useMemo(() => (user ? where('createdBy', '==', user.uid) : null), [user]);
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(useMemo(() => baseQuery ? query(collection(firestore, 'clients'), baseQuery) : null, [firestore, baseQuery]));
  const { data: contactsData, loading: contactsLoading } = useCollection<Contact>(useMemo(() => baseQuery ? query(collection(firestore, 'contacts'), baseQuery) : null, [firestore, baseQuery]));
  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(useMemo(() => baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null, [firestore, baseQuery]));
  const { data: psData, loading: psLoading } = useCollection<ProductOrService>(useMemo(() => baseQuery ? query(collection(firestore, 'productsAndServices'), baseQuery) : null, [firestore, baseQuery]));

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', selectedFields: [], filters: [], sorting: [] },
  });

  const { fields: filterFields, append: appendFilter, remove: removeFilter } = useFieldArray({ control: form.control, name: 'filters' });
  const { fields: sortFields, append: appendSort, remove: removeSort } = useFieldArray({ control: form.control, name: 'sorting' });

  const watchedDataSource = form.watch('primaryDataSource');
  const watchedSelectedFields = form.watch('selectedFields');

  const getFieldType = useCallback((fieldKey: string) => {
    if (!fieldKey) return 'string';
    const [source, field] = fieldKey.split('.');
    return reportableFields[source as DataSource]?.fields[field]?.type || 'string';
  }, []);
  
  const getNestedValue = (item: any, fieldKey: string) => {
      const path = fieldKey.split('.');
      if(path.length === 2) {
          const [source, field] = path;
          if (source === 'client') return item.__client?.[field];
          if (source === 'contact') return item.__contact?.[field];
          // For primary source, the data is at top level
          if (source === watchedDataSource) return item[field];
      }
      return item[fieldKey]; // Fallback for single key
  }

  const getJoinedData = useCallback(() => {
    if (!watchedDataSource) return [];

    let baseData: any[] = [];
    if (watchedDataSource === 'clients') baseData = clientsData || [];
    else if (watchedDataSource === 'contacts') baseData = contactsData || [];
    else if (watchedDataSource === 'opportunities') baseData = opportunitiesData || [];
    else if (watchedDataSource === 'productsAndServices') baseData = psData || [];

    const clientMap = new Map(clientsData?.map(c => [c.id, c]));
    const contactMap = new Map(contactsData?.map(c => [c.id, c]));

    return baseData.map(item => {
      let client, contact;
      if (item.clientId) {
        client = clientMap.get(item.clientId);
      }
      if (item.contactId) {
        contact = contactMap.get(item.contactId)
      } else if (client?.id) {
        // Fallback for contacts from client
        const clientContacts = contactsData?.filter(c => c.clientId === client.id);
        if(clientContacts?.length === 1) contact = clientContacts[0];
      }
      return {
        ...item,
        __client: client,
        __contact: contact
      };
    });
  }, [watchedDataSource, clientsData, contactsData, opportunitiesData, psData]);
  
  const generateReport = useCallback((dataSource: DataSource, fields: string[], filters?: ReportFilter[], sorts?: ReportSort[]) => {
     if (!dataSource || !fields || fields.length === 0) return;
     setIsGenerating(true);
     setReportResult(null);

    setTimeout(() => {
        const joined = getJoinedData();
        let filtered = joined;
        
        // Apply Filters
        if (filters && filters.length > 0) {
            filtered = joined.filter(item => {
                return filters.every(filter => {
                    if (!filter.field || !filter.operator) return true;
                    
                    let itemValue: any;
                    const [source, fieldName] = filter.field.split('.');
                    if (source === 'client') itemValue = item.__client?.[fieldName];
                    else if (source === 'contact') itemValue = item.__contact?.[fieldName];
                    else itemValue = item[fieldName];
                    
                    const filterValue = filter.value;

                    if(filter.field === 'opportunities.stage' && filterValue === 'Open') {
                        return ['Prospecting', 'Proposal', 'Negotiation'].includes(item.stage);
                    }

                    if (itemValue === undefined || itemValue === null) return false;

                    const type = getFieldType(filter.field);
                    
                    switch (filter.operator) {
                        case 'contains': return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                        case 'not_contains': return !String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                        case 'equals': return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
                        case 'not_equals': return String(itemValue).toLowerCase() !== String(filterValue).toLowerCase();
                        case 'eq': return type === 'date' ? format(new Date(itemValue), 'yyyy-MM-dd') === format(new Date(filterValue), 'yyyy-MM-dd') : itemValue === Number(filterValue);
                        case 'neq': return type === 'date' ? format(new Date(itemValue), 'yyyy-MM-dd') !== format(new Date(filterValue), 'yyyy-MM-dd') : itemValue !== Number(filterValue);
                        case 'gt': return type === 'date' ? new Date(itemValue) > new Date(filterValue) : itemValue > Number(filterValue);
                        case 'lt': return type === 'date' ? new Date(itemValue) < new Date(filterValue) : itemValue < Number(filterValue);
                        case 'gte': return itemValue >= Number(filterValue);
                        case 'lte': return itemValue <= Number(filterValue);
                        case 'is': return String(itemValue) === String(filterValue);
                        case 'is_not': return String(itemValue) !== String(filterValue);
                        case 'in': return Array.isArray(filterValue) ? filterValue.includes(itemValue) : false;
                        default: return true;
                    }
                });
            });
        }
        
        // Apply Sorting
        if (sorts && sorts.length > 0) {
          filtered.sort((a, b) => {
            for (const sort of sorts) {
              const [sourceA, fieldNameA] = sort.field.split('.');
              let valA = sourceA === 'client' ? a.__client?.[fieldNameA] : sourceA === 'contact' ? a.__contact?.[fieldNameA] : a[fieldNameA];

              const [sourceB, fieldNameB] = sort.field.split('.');
              let valB = sourceB === 'client' ? b.__client?.[fieldNameB] : sourceB === 'contact' ? b.__contact?.[fieldNameB] : b[fieldNameB];

              if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }

        const newColumns = fields.map(fieldKey => {
          const [source, field] = fieldKey.split('.');
          const sourceName = source as keyof typeof reportableFields;
          return { accessorKey: fieldKey, header: t(reportableFields[sourceName]?.fields[field]?.label || fieldKey) };
        });

        const newData = filtered.map(item => {
          const row: Record<string, any> = {};
          fields.forEach(fieldKey => {
            const [source, field] = fieldKey.split('.');
            if (source === 'client') row[fieldKey] = item.__client?.[field];
            else if (source === 'contact') row[fieldKey] = item.__contact?.[field];
            else row[fieldKey] = item[field];
          });
          return row;
        });

        setReportResult({ data: newData, columns: newColumns });
        setIsGenerating(false);
     }, 500);
  }, [getJoinedData, getFieldType, t, watchedDataSource]);

  useEffect(() => {
    if (existingReport) {
      form.reset({
        name: existingReport.name,
        description: existingReport.description || '',
        primaryDataSource: existingReport.primaryDataSource,
        selectedFields: existingReport.selectedFields,
        filters: existingReport.filters || [],
        sorting: existingReport.sorting || [],
      });
      if (shouldRunOnLoad) {
        generateReport(
          existingReport.primaryDataSource,
          existingReport.selectedFields,
          existingReport.filters,
          existingReport.sorting
        );
      }
    }
  }, [existingReport, shouldRunOnLoad, form, generateReport]);

  const availableFieldsForFilter = useMemo(() => {
    if (!watchedDataSource) return [];
    let fields: { label: string; value: string }[] = [];
    
    const addFieldsFromSource = (sourceKey: DataSource) => {
        Object.keys(reportableFields[sourceKey].fields).forEach(fieldKey => {
            const fieldConfig = reportableFields[sourceKey].fields[fieldKey];
            if (fieldConfig.type !== 'array') { // Exclude array types from filtering for now
                const prefix = sourceKey === watchedDataSource ? '' : `${fieldConfig.isRelational ? sourceKey.replace('s', '') : sourceKey}.`;
                fields.push({
                    label: `${t(reportableFields[sourceKey].header)}: ${t(fieldConfig.label)}`,
                    value: `${prefix}${fieldKey}`
                });
            }
        });
    };

    addFieldsFromSource(watchedDataSource);
    if (watchedDataSource === 'opportunities') {
        addFieldsFromSource('clients');
        addFieldsFromSource('contacts');
    }
    if (watchedDataSource === 'contacts') {
        addFieldsFromSource('clients');
    }
    
    // De-duplicate and sort
    const uniqueFields = Array.from(new Map(fields.map(f => [f.value, f])).values());
    return uniqueFields.sort((a,b) => a.label.localeCompare(b.label));
}, [watchedDataSource, t]);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
  }, [user, userLoading]);

  const getEnumValues = useCallback((fieldKey: string) => {
    if (!fieldKey) return [];
    const [source, field] = fieldKey.split('.');
    return reportableFields[source as DataSource]?.fields[field]?.enumValues || [];
  }, []);

  async function handleSave(values: ReportFormData) {
    if (!user) return;
    setIsSaving(true);
    
    try {
      if (isNew) {
        const newReportRef = await addReport(firestore, user.uid, values);
        toast({ variant: 'success', title: t('Reports.saveSuccess') });
        router.replace(`/reports/builder/${newReportRef.id}`);
      } else {
        await updateReport(firestore, user.uid, reportId, values);
        toast({ variant: 'success', title: t('Reports.updateSuccess') });
      }
    } catch (error) {
       toast({ variant: 'destructive', title: t('Reports.saveError') });
    } finally {
        setIsSaving(false);
    }
  }

  const handleFieldToggle = (fieldKey: string) => {
    const currentFields = form.getValues('selectedFields');
    const newFields = currentFields.includes(fieldKey)
      ? currentFields.filter(f => f !== fieldKey)
      : [...currentFields, fieldKey];
    form.setValue('selectedFields', newFields, { shouldValidate: true });
  };
  
  if ((reportLoading && !isNew) || userLoading) {
    return <div className="flex-1 p-6"><Skeleton className="h-96 w-full" /></div>
  }
  const pageIsLoading = userLoading || reportLoading || clientsLoading || contactsLoading || opportunitiesLoading || psLoading;

  const renderFilterValueInput = (index: number) => {
    const fieldKey = form.watch(`filters.${index}.field`);
    const operator = form.watch(`filters.${index}.operator`);
    if (!fieldKey || !operator) return null;

    const [source, field] = fieldKey.split('.');
    const type = reportableFields[source as DataSource]?.fields[field]?.type;

    if (type === 'date') {
      return <Popover><PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.getValues(`filters.${index}.value`) && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {form.getValues(`filters.${index}.value`) ? format(new Date(form.getValues(`filters.${index}.value`)), 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
          </Button>
      </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.getValues(`filters.${index}.value`) ? new Date(form.getValues(`filters.${index}.value`)) : undefined} onSelect={date => form.setValue(`filters.${index}.value`, date?.toISOString())} initialFocus /></PopoverContent></Popover>
    }

    if (type === 'enum') {
        const options = reportableFields[source as DataSource]?.fields[field]?.enumValues || [];
        const specialOptions: Record<string, string[]> = {
            'opportunities.stage': ['Open']
        }
        const allOptions = [...options, ...(specialOptions[fieldKey] || [])];

        return <Select onValueChange={value => form.setValue(`filters.${index}.value`, value)} value={form.getValues(`filters.${index}.value`)}>
            <SelectTrigger><SelectValue placeholder={t('Reports.selectValue')} /></SelectTrigger>
            <SelectContent>{allOptions.map(o => <SelectItem key={o} value={o}>{o === 'Open' ? t('Reports.openOpportunities') : t(`Stages.${o}`) || t(`Status.${o}`) || o}</SelectItem>)}</SelectContent>
        </Select>
    }

    if (type === 'boolean') {
        return <Select onValueChange={value => form.setValue(`filters.${index}.value`, value === 'true')} value={String(form.getValues(`filters.${index}.value`))}>
            <SelectTrigger><SelectValue placeholder={t('Reports.selectValue')} /></SelectTrigger>
            <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
            </SelectContent>
        </Select>
    }
    
    return <Input type={type === 'number' ? 'number' : 'text'} {...form.register(`filters.${index}.value`)} />;
  }

  return (
    <div className="flex flex-1 flex-col">
       <AppHeader title={isNew ? t('Reports.createNew') : t('Actions.editReport')} />
       <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
                 <Card>
                    <CardHeader><CardTitle>{t('Reports.step1')}</CardTitle><CardDescription>{t('Reports.step1Desc')}</CardDescription></CardHeader>
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
                    <CardHeader><CardTitle>{t('Reports.step2')}</CardTitle><CardDescription>{t('Reports.step2Desc')}</CardDescription></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="primaryDataSource" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('Reports.dataSource')}</FormLabel>
                                <Select onValueChange={val => { field.onChange(val); form.setValue('selectedFields', []); form.setValue('filters', []); form.setValue('sorting', []); }} value={field.value}>
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
                        <CardHeader><CardTitle>{t('Reports.step3')}</CardTitle><CardDescription>{t('Reports.step3Desc')}</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(reportableFields).map(([source, group]) => {
                                const isPrimary = source === watchedDataSource;
                                let isRelated = false;
                                if (watchedDataSource === 'opportunities' && (source === 'clients' || source === 'contacts')) isRelated = true;
                                if (watchedDataSource === 'contacts' && source === 'clients') isRelated = true;
                                
                                const isSelectable = isPrimary || isRelated;
                                if (!isSelectable) return null;

                                return (
                                <div key={source}>
                                    <h4 className="mb-2 text-md font-semibold flex items-center gap-2">
                                        {t(group.header)} 
                                        {isPrimary && <Badge>{t('Reports.primary')}</Badge>}
                                        {isRelated && <Badge variant="secondary">{t('Reports.related')}</Badge>}
                                    </h4>
                                    <div className={cn("grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4 lg:grid-cols-5")}>
                                    {Object.entries(group.fields).map(([field, fieldConfig]) => {
                                        const prefix = source === watchedDataSource ? '' : `${fieldConfig.isRelational ? source.replace(/s$/, '') : source}.`;
                                        const fieldKey = `${prefix}${field}`;

                                        const fieldKeyForSelection = `${source}.${field}`;
                                        
                                        return (
                                            <div key={fieldKeyForSelection} className="flex items-center space-x-2">
                                                <Checkbox id={fieldKeyForSelection} checked={watchedSelectedFields.includes(fieldKeyForSelection)} onCheckedChange={() => handleFieldToggle(fieldKeyForSelection)} />
                                                <Label htmlFor={fieldKeyForSelection} className="font-normal">{t(fieldConfig.label)}</Label>
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

                {watchedDataSource && <Card>
                    <CardHeader><CardTitle>{t('Reports.step4')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold">{t('Reports.filters')}</h4>
                            <div className="space-y-2 mt-2">
                                {filterFields.map((item, index) => {
                                  const fieldKey = form.watch(`filters.${index}.field`);
                                  const fieldType = fieldKey ? (reportableFields[fieldKey.split('.')[0] as DataSource]?.fields[fieldKey.split('.')[1]]?.type || 'string') : 'string';

                                  return (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                                        <FormField control={form.control} name={`filters.${index}.field`} render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select field..." /></SelectTrigger>
                                            <SelectContent>{Object.entries(reportableFields).filter(([source, _]) => source === watchedDataSource || (watchedDataSource === 'opportunities' && (source === 'clients' || source === 'contacts')) || (watchedDataSource === 'contacts' && source === 'clients')).map(([source, group]) => (
                                                <SelectGroup key={source}>
                                                    <SelectLabel>{t(group.header)}</SelectLabel>
                                                    {Object.keys(group.fields).filter(f => group.fields[f].type !== 'array').map(field => (
                                                        <SelectItem key={`${source}.${field}`} value={`${source}.${field}`}>{t(group.fields[field].label)}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}</SelectContent></Select>
                                        )} />
                                        <FormField control={form.control} name={`filters.${index}.operator`} render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select operator..." /></SelectTrigger>
                                            <SelectContent>{operatorsByType[fieldType as keyof typeof operatorsByType]?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                                        )} />
                                        <div className="md:col-span-1">{renderFilterValueInput(index)}</div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFilter(index)}><Trash2 className="text-destructive"/></Button>
                                    </div>
                                )})}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendFilter({ id: nanoid(), field: '', operator: '', value: '' })}><Plus className="mr-2"/>{t('Reports.addFilter')}</Button>
                        </div>
                        <div className="pt-4">
                             <h4 className="font-semibold">{t('Reports.sorting')}</h4>
                             <div className="space-y-2 mt-2">
                                {sortFields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-2 items-center">
                                        <div className="md:col-span-1">
                                            <FormField control={form.control} name={`sorting.${index}.field`} render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select field..." /></SelectTrigger>
                                                <SelectContent>{Object.entries(reportableFields).filter(([source, _]) => source === watchedDataSource || (watchedDataSource === 'opportunities' && (source === 'clients' || source === 'contacts')) || (watchedDataSource === 'contacts' && source === 'clients')).map(([source, group]) => (
                                                    <SelectGroup key={source}>
                                                        <SelectLabel>{t(group.header)}</SelectLabel>
                                                        {Object.keys(group.fields).filter(f => group.fields[f].type !== 'array').map(field => (
                                                            <SelectItem key={`${source}.${field}`} value={`${source}.${field}`}>{t(group.fields[field].label)}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}</SelectContent></Select>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name={`sorting.${index}.direction`} render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select direction..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="asc"><ArrowUp className="inline-block mr-2"/>Ascending</SelectItem>
                                                <SelectItem value="desc"><ArrowDown className="inline-block mr-2"/>Descending</SelectItem>
                                            </SelectContent></Select>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSort(index)}><Trash2 className="text-destructive"/></Button>
                                    </div>
                                ))}
                             </div>
                              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendSort({ id: nanoid(), field: '', direction: 'asc' })}><Plus className="mr-2"/>{t('Reports.addSort')}</Button>
                        </div>
                    </CardContent>
                </Card>}

                <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.push('/reports')}>{t('Auth.cancelLabel')}</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : t('Reports.saveReport')}</Button>
                    <Button type="button" onClick={() => generateReport(form.getValues('primaryDataSource'), form.getValues('selectedFields'), form.getValues('filters'), form.getValues('sorting'))} disabled={isGenerating || watchedSelectedFields.length === 0}>
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
