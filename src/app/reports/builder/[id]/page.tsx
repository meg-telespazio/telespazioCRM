'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, Contact, Opportunity, Report } from '@/lib/types';
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
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type DataSource = 'clients' | 'contacts' | 'opportunities';

const reportableFields: Record<
  DataSource,
  { header: string; fields: Record<string, string> }
> = {
  clients: {
    header: 'Reports.dataSources.clients',
    fields: {
      publicId: 'Table.clientId',
      name: 'Forms.clientName',
      cuit: 'Forms.cuit',
      email: 'Forms.clientEmail',
      phone: 'Forms.clientPhone',
      website: 'Forms.website',
      status: 'Table.status',
      industry: 'Table.industry',
      createdAt: 'Table.createdDate',
    },
  },
  contacts: {
    header: 'Reports.dataSources.contacts',
    fields: {
      publicId: 'Table.contactId',
      name: 'Forms.contactName',
      emails: 'Forms.emails',
      phones: 'Forms.phones',
      createdAt: 'Table.createdDate',
    },
  },
  opportunities: {
    header: 'Reports.dataSources.opportunities',
    fields: {
      publicId: 'Table.opportunityId',
      title: 'Dashboard.recentOpportunities.opportunityHeader',
      value: 'Dashboard.recentOpportunities.valueHeader',
      stage: 'Dashboard.recentOpportunities.stageHeader',
      probability: 'Forms.probability',
      closeDate: 'Forms.estCloseDate',
      contractMonths: 'Forms.contractMonths',
      requestDate: 'Forms.requestDate',
      offerSentDate: 'Forms.offerSentDate',
      isTender: 'Forms.isTender',
      createdAt: 'Table.createdDate',
    },
  },
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(3, t('Reports.validation.nameMin')),
    description: z.string().optional(),
    primaryDataSource: z.enum(['clients', 'contacts', 'opportunities'], {
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
  const { t } = useI18n();
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

  // --- Data for generation ---
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
  // ---

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
      if (shouldRunOnLoad) {
        generateReport(existingReport.selectedFields, existingReport.primaryDataSource);
      }
    }
  }, [existingReport]);


  const watchedDataSource = form.watch('primaryDataSource');
  const watchedSelectedFields = form.watch('selectedFields');

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  async function handleSave(values: ReportFormData) {
    if (!user) return;
    setIsSaving(true);
    
    try {
      if (isNew) {
        const newReport = await addReport(firestore, user.uid, values);
        toast({ variant: 'success', title: t('Reports.saveSuccess') });
        router.replace(`/reports/builder/${newReport.id}`);
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

  function generateReport(fields: string[], dataSource?: DataSource) {
     if (!dataSource) return;
     setIsGenerating(true);
     setReportResult(null);

    // Simulate generation delay
    setTimeout(() => {
        const clientMap = new Map(clientsData?.map(c => [c.id, c]));
        
        let baseData: any[] = [];
        if (dataSource === 'clients') baseData = clientsData || [];
        if (dataSource === 'contacts') baseData = contactsData || [];
        if (dataSource === 'opportunities') baseData = opportunitiesData || [];
      
        const newColumns = fields.map(fieldKey => {
            const [source, field] = fieldKey.split('.');
            const sourceName = source as keyof typeof reportableFields;
            const fieldName = field as keyof typeof reportableFields[typeof sourceName]['fields'];
            return { accessorKey: fieldKey, header: t(reportableFields[sourceName].fields[fieldName]) };
        });

        const newData = baseData.map(primaryRecord => {
          const row: Record<string, any> = {};
          
          let client: Client | undefined;
          let contact: Contact | undefined;
          let opportunity: Opportunity | undefined;

          // Establish context based on primary data source
          if (dataSource === 'opportunities') {
            opportunity = primaryRecord;
            if (opportunity) client = clientMap.get(opportunity.clientId);
            // More relations can be added here
          } else if (dataSource === 'contacts') {
             contact = primaryRecord;
             if (contact) client = clientMap.get(contact.clientId);
          } else if (dataSource === 'clients') {
             client = primaryRecord;
          }
          
          // Populate all possible fields based on established context
          for (const fieldKey of fields) {
            const [source, field] = fieldKey.split('.');
            let value;
            if (source === 'clients' && client) value = client[field as keyof Client];
            if (source === 'contacts' && contact) value = contact[field as keyof Contact];
            if (source === 'opportunities' && opportunity) value = opportunity[field as keyof Opportunity];
            
            // Add related data
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
    
    // Auto-include related sources' fields
    if (source === 'opportunities' && !currentFields.some(f => f.startsWith('clients'))) {
        newFields.push('clients.name');
    }

    form.setValue('selectedFields', newFields, { shouldValidate: true });
  };
  
  const pageIsLoading = userLoading || reportLoading || clientsLoading || contactsLoading || opportunitiesLoading;
  
  if (pageIsLoading && !isNew) {
    return <div className="flex-1 p-6"><Skeleton className="h-96 w-full" /></div>
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
                                let isDisabled = !isPrimary;

                                if (watchedDataSource === 'opportunities' && source === 'clients') isDisabled = false;
                                if (watchedDataSource === 'opportunities' && source === 'contacts') isDisabled = false;
                                if (watchedDataSource === 'contacts' && source === 'clients') isDisabled = false;
                                
                                if (isDisabled && !watchedSelectedFields.some(f => f.startsWith(source))) return null;

                                return (
                                <div key={source}>
                                    <h4 className="mb-2 text-md font-semibold flex items-center gap-2">
                                        {t(group.header)} 
                                        {isPrimary && <Badge>{t('Reports.primary')}</Badge>}
                                        {isDisabled && <Badge variant="secondary">{t('Reports.related')}</Badge>}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4 lg:grid-cols-5">
                                    {Object.keys(group.fields).map(field => {
                                        const fieldKey = `${source}.${field}`;
                                        return (
                                            <div key={fieldKey} className="flex items-center space-x-2">
                                                <Checkbox
                                                id={fieldKey}
                                                checked={watchedSelectedFields.includes(fieldKey)}
                                                onCheckedChange={() => handleFieldToggle(fieldKey, source as DataSource)}
                                                disabled={!isPrimary && !isDisabled && source !== watchedDataSource}
                                                />
                                                <Label htmlFor={fieldKey} className="font-normal">{t(group.fields[field])}</Label>
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


                <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.push('/reports')}>{t('Auth.cancelLabel')}</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : t('Reports.saveReport')}</Button>
                    <Button type="button" onClick={() => generateReport(form.getValues('selectedFields'), form.getValues('primaryDataSource'))} disabled={isGenerating || watchedSelectedFields.length === 0}>
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
