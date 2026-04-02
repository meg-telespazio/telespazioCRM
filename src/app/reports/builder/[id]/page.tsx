
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { 
  Client, Contact, Opportunity, ProductOrService, 
  Report, ReportConfig, Contract, PurchaseOrder, 
  Service, Equipment, Activity, Location 
} from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { addReport, updateReport } from '@/lib/firestore/reports';
import { useToast } from '@/hooks/use-toast';
import { ReportResultTable } from '@/components/reports/report-result-table';
import { 
  Loader2, 
  Database, 
  Columns, 
  Sigma, 
  Filter as FilterIcon, 
  Plus,
  Trash2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(3, t('Reports.validation.nameMin')),
    description: z.string().optional(),
  });

type ReportFormData = z.infer<ReturnType<typeof getFormSchema>>;

const SCHEMA = {
  clients: ['name', 'cuit', 'sector', 'subsector', 'status', 'email', 'phone', 'holding', 'website', 'countryHQ', 'costCenterId', 'publicId', 'notes'],
  contacts: ['name', 'position', 'area', 'notes', 'publicId'],
  opportunities: ['title', 'stage', 'value', 'currency', 'probability', 'closeDate', 'requestDate', 'offerSentDate', 'risk', 'opportunityType', 'publicId', 'isPlanned', 'isTender', 'grossMarginPercentage', 'grossMarginAmount'],
  contracts: ['publicId', 'type', 'status', 'amount', 'currency', 'startDate', 'endDate', 'signatureDate', 'autoRenews', 'renewalTerm', 'country', 'authorizedBy', 'costCenterId', 'notes'],
  purchaseOrders: ['poNumber', 'amount', 'currency', 'status', 'emissionDate', 'idContractStarfleet', 'idClientStarfleet'],
  services: ['serviceNickname', 'serviceLineNumber', 'servicePlan', 'monthlyFee', 'currency', 'serviceAllocationGb', 'partnerName', 'customerName', 'customerAccountNumber', 'topUp', 'isTelespazioOwned', 'status'],
  equipment: ['userTerminal', 'id', 'type', 'physicalStatus', 'installationDate', 'isClientOwned', 'comodatoFee', 'latitude', 'longitude'],
  activities: ['type', 'description', 'isPriority', 'dueDate', 'publicId'],
  locations: ['name', 'type', 'city', 'province', 'country', 'status', 'streetName', 'streetNumber', 'postalCode', 'publicId']
};

export default function ReportManualBuilderPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();

  const reportId = params.id as string;
  const isNew = reportId === 'new';

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('source');
  
  const [config, setConfig] = useState<ReportConfig>({
    primaryDataSource: 'contracts',
    fields: ['contracts.publicId', 'clients.name', 'contracts.amount'],
    filters: [],
    sorting: [],
    aggregations: []
  });

  const [reportResult, setReportResult] = useState<{ data: any[]; columns: any[] } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const reportDocRef = useMemo(() => {
    if (!user || isNew || !firestore) return null;
    return doc(firestore, `users/${user.uid}/reports`, reportId);
  }, [firestore, user, reportId, isNew]);

  const { data: existingReport, loading: reportLoading } = useDoc<Report>(reportDocRef);

  const getCollectionQuery = useCallback((collName: string) => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, collName);
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [user, firestore]);

  const { data: clients } = useCollection<Client>(useMemo(() => getCollectionQuery('clients'), [getCollectionQuery]));
  const { data: contacts } = useCollection<Contact>(useMemo(() => getCollectionQuery('contacts'), [getCollectionQuery]));
  const { data: opportunities } = useCollection<Opportunity>(useMemo(() => getCollectionQuery('opportunities'), [getCollectionQuery]));
  const { data: ps } = useCollection<ProductOrService>(useMemo(() => getCollectionQuery('productsAndServices'), [getCollectionQuery]));
  const { data: contracts } = useCollection<Contract>(useMemo(() => getCollectionQuery('contracts'), [getCollectionQuery]));
  const { data: pos } = useCollection<PurchaseOrder>(useMemo(() => getCollectionQuery('purchaseOrders'), [getCollectionQuery]));
  const { data: services } = useCollection<Service>(useMemo(() => getCollectionQuery('services'), [getCollectionQuery]));
  const { data: equipment } = useCollection<Equipment>(useMemo(() => getCollectionQuery('equipment'), [getCollectionQuery]));
  const { data: activities } = useCollection<Activity>(useMemo(() => getCollectionQuery('activities'), [getCollectionQuery]));
  const { data: locations } = useCollection<Location>(useMemo(() => getCollectionQuery('locations'), [getCollectionQuery]));

  const collectionsMap = useMemo(() => ({
    clients, contacts, opportunities, productsAndServices: ps, contracts, purchaseOrders: pos, services, equipment, activities, locations
  }), [clients, contacts, opportunities, ps, contracts, pos, services, equipment, activities, locations]);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (existingReport) {
      form.reset({
        name: existingReport.name,
        description: existingReport.description || '',
      });
      setConfig(existingReport.config);
    }
  }, [existingReport, form]);

  const runReport = useCallback((reportConfig: ReportConfig) => {
    if (!reportConfig || !collectionsMap) return;
    
    setIsCalculating(true);

    setTimeout(() => {
      const sourceData = (collectionsMap as any)[reportConfig.primaryDataSource];
      if (!sourceData) {
        setIsCalculating(false);
        return;
      }

      const clientMap = new Map(collectionsMap.clients?.map(c => [c.id, c]));
      const poMap = new Map(collectionsMap.purchaseOrders?.map(p => [p.id, p]));
      const contractMap = new Map(collectionsMap.contracts?.map(c => [c.id, c]));
      const equipMap = new Map(collectionsMap.equipment?.map(e => [e.id, e]));

      const processed = sourceData.map((item: any) => {
        const row: any = { [reportConfig.primaryDataSource]: item };
        
        if (item.clientId) {
          row.clients = clientMap.get(item.clientId);
        }

        if (reportConfig.primaryDataSource === 'services') {
          const po = poMap.get(item.poId);
          if (po) {
            row.purchaseOrders = po;
            const contract = contractMap.get(po.contractId);
            if (contract) {
              row.contracts = contract;
              if (!row.clients) row.clients = clientMap.get(contract.clientId);
            }
          }
          if (item.equipmentId) {
            row.equipment = equipMap.get(item.equipmentId);
          }
        }

        if (reportConfig.primaryDataSource === 'purchaseOrders') {
          const contract = contractMap.get(item.contractId);
          if (contract) {
            row.contracts = contract;
            if (!row.clients) row.clients = clientMap.get(contract.clientId);
          }
        }

        return row;
      });

      let filtered = processed;
      if (reportConfig.filters?.length) {
        filtered = processed.filter((item: any) => {
          return reportConfig.filters.every(f => {
            const [source, field] = f.field.split('.');
            const val = item[source]?.[field];
            
            if (f.operator === 'is_not_empty') {
              return val !== undefined && val !== null && val !== '';
            }

            if (val === undefined || val === null) return false;
            
            const stringVal = String(val).toLowerCase();
            const stringFilter = String(f.value || '').toLowerCase();

            switch (f.operator) {
              case 'contains': return stringVal.includes(stringFilter);
              case 'equals': return stringVal === stringFilter;
              case 'not_equals': return stringVal !== stringFilter;
              case 'gt': return Number(val) > Number(f.value);
              case 'lt': return Number(val) < Number(f.value);
              case 'gte': return Number(val) >= Number(f.value);
              case 'lte': return Number(val) <= Number(f.value);
              default: return true;
            }
          });
        });
      }

      let finalData = filtered;
      let finalColumns = reportConfig.fields.map(fKey => {
        const [source, field] = fKey.split('.');
        return { accessorKey: fKey, header: `${source}.${field}` };
      });

      if (reportConfig.aggregations?.length && reportConfig.groupBy && reportConfig.groupBy !== 'none') {
        const groups = new Map<string, any>();
        const [groupSource, groupField] = reportConfig.groupBy.split('.');

        filtered.forEach((row: any) => {
          const groupValue = row[groupSource]?.[groupField];
          const groupKey = groupValue !== undefined && groupValue !== null ? String(groupValue) : 'N/A';
          if (!groups.has(groupKey)) {
            groups.set(groupKey, { _key: groupKey, _records: [] });
          }
          groups.get(groupKey)._records.push(row);
        });

        finalData = Array.from(groups.values()).map(group => {
          const aggregatedRow: any = {};
          aggregatedRow[reportConfig.groupBy!] = group._key;

          reportConfig.aggregations!.forEach(agg => {
            const [aggSource, aggField] = agg.field.split('.');
            const numericValues = group._records
              .map((r: any) => r[aggSource]?.[aggField])
              .filter((v: any) => v !== undefined && v !== null && !isNaN(Number(v)))
              .map((v: any) => Number(v));
            
            let result = 0;
            if (agg.type === 'sum') result = numericValues.reduce((a: number, b: number) => a + b, 0);
            else if (agg.type === 'avg') result = numericValues.length ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length : 0;
            else if (agg.type === 'count') result = group._records.length;

            aggregatedRow[`${agg.field}_${agg.type}`] = result;
          });
          return aggregatedRow;
        });

        finalColumns = [
          { accessorKey: reportConfig.groupBy, header: t('Reports.groupBy') + ' ' + reportConfig.groupBy },
          ...reportConfig.aggregations.map(agg => ({
            accessorKey: `${agg.field}_${agg.type}`,
            header: `${agg.type.toUpperCase()}(${agg.field})`
          }))
        ];
      } else if (reportConfig.sorting?.length) {
        finalData.sort((a: any, b: any) => {
          for (const sort of reportConfig.sorting) {
            const [source, field] = sort.field.split('.');
            const valA = a[source]?.[field];
            const valB = b[source]?.[field];
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      setReportResult({ data: finalData, columns: finalColumns });
      setIsCalculating(false);
    }, 10);
  }, [collectionsMap, t]);

  useEffect(() => {
    if (mounted && collectionsMap.clients && collectionsMap.contracts) {
      const handler = setTimeout(() => {
        runReport(config);
      }, 800);
      return () => clearTimeout(handler);
    }
  }, [config, collectionsMap, mounted, runReport]);

  async function handleSave(values: ReportFormData) {
    if (!user || !config) return;
    setIsSaving(true);
    try {
      if (isNew) {
        const newReportRef = await addReport(firestore, user.uid, { ...values, config });
        toast({ variant: 'success', title: t('Reports.saveSuccess') });
        router.replace(`/reports/builder/${newReportRef.id}`);
      } else {
        await updateReport(firestore, user.uid, reportId, { ...values, config });
        toast({ variant: 'success', title: t('Reports.updateSuccess') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t('Reports.saveError') });
    } finally {
      setIsSaving(false);
    }
  }

  const toggleField = (field: string) => {
    setConfig(prev => {
      const fields = prev.fields.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field];
      return { ...prev, fields };
    });
  };

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...(prev.filters || []), { field: `${prev.primaryDataSource}.${SCHEMA[prev.primaryDataSource as keyof typeof SCHEMA][0]}`, operator: 'contains', value: '' }]
    }));
  };

  const removeFilter = (index: number) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const addAggregation = () => {
    setConfig(prev => ({
      ...prev,
      aggregations: [...(prev.aggregations || []), { field: `${prev.primaryDataSource}.${SCHEMA[prev.primaryDataSource as keyof typeof SCHEMA][0]}`, type: 'sum' }]
    }));
  };

  const removeAggregation = (index: number) => {
    setConfig(prev => ({
      ...prev,
      aggregations: (prev.aggregations || []).filter((_, i) => i !== index)
    }));
  };

  if (userLoading || reportLoading || !mounted) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6"><Skeleton className="h-96 w-full" /></main>
      </div>
    );
  }

  const primaryOptions = Object.keys(SCHEMA);
  const relatedOptions = ['clients', 'contracts', 'purchaseOrders', 'equipment', 'opportunities', 'locations', 'activities'].filter(o => o !== config.primaryDataSource);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={isNew ? t('Reports.createNew') : t('Actions.editReport')}>
        <Button variant="outline" onClick={() => router.push('/reports')}>
          {t('Auth.cancelLabel')}
        </Button>
        <Button onClick={form.handleSubmit(handleSave)} disabled={isSaving || isCalculating}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('Reports.saveReport')}
        </Button>
      </AppHeader>
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        <div className="mx-auto max-w-6xl space-y-6">
          <Form {...form}>
            <form className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      {t('Reports.step1')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Reports.reportName')}</FormLabel>
                        <FormControl><Input {...field} placeholder={t('Reports.reportNamePlaceholder')} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Reports.reportDescription')}</FormLabel>
                        <FormControl><Textarea {...field} rows={2} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="shadow-md relative overflow-hidden">
                  {isCalculating && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">Procesando Datos...</span>
                      </div>
                    </div>
                  )}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <CardHeader className="border-b bg-slate-50/50 p-0 overflow-hidden">
                      <TabsList className="w-full justify-start rounded-none bg-transparent h-12 overflow-x-auto flex-nowrap scrollbar-hide">
                        <TabsTrigger value="source" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2 shrink-0">
                          <Database className="h-4 w-4" /> {t('Reports.dataSource')}
                        </TabsTrigger>
                        <TabsTrigger value="fields" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2 shrink-0">
                          <Columns className="h-4 w-4" /> {t('Reports.step3')}
                        </TabsTrigger>
                        <TabsTrigger value="aggregation" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2 shrink-0">
                          <Sigma className="h-4 w-4" /> {t('Reports.aggregation')}
                        </TabsTrigger>
                        <TabsTrigger value="filters" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2 shrink-0">
                          <FilterIcon className="h-4 w-4" /> {t('Reports.filters')}
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <TabsContent value="source" className="mt-0 space-y-4">
                        <div className="space-y-4">
                          <FormLabel>{t('Reports.selectDataSource')}</FormLabel>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {primaryOptions.map(source => (
                              <div 
                                key={source} 
                                onClick={() => setConfig(prev => ({ ...prev, primaryDataSource: source, fields: [`${source}.${SCHEMA[source as keyof typeof SCHEMA][0]}`] }))}
                                className={cn(
                                  "cursor-pointer p-4 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all hover:border-primary/50",
                                  config.primaryDataSource === source ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-white"
                                )}
                              >
                                <Database className={cn("h-6 w-6", config.primaryDataSource === source ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-xs font-bold uppercase">{t(`Reports.dataSources.${source}`)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="fields" className="mt-0 space-y-6">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                              <Badge variant="outline">{t(`Reports.dataSources.${config.primaryDataSource}`)}</Badge>
                              {t('Reports.primaryTable')}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {SCHEMA[config.primaryDataSource as keyof typeof SCHEMA].map(field => {
                                const fullPath = `${config.primaryDataSource}.${field}`;
                                return (
                                  <div key={fullPath} className="flex items-center space-x-2 border p-2 rounded-md bg-slate-50">
                                    <Checkbox 
                                      id={fullPath} 
                                      checked={config.fields.includes(fullPath)}
                                      onCheckedChange={() => toggleField(fullPath)}
                                    />
                                    <label htmlFor={fullPath} className="text-xs cursor-pointer select-none">{field}</label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                              <Badge variant="secondary">{t('Reports.relatedTables')}</Badge>
                            </h4>
                            <div className="space-y-4">
                              {relatedOptions.map(source => (
                                <div key={source} className="space-y-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t(`Reports.dataSources.${source}`)}</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {SCHEMA[source as keyof typeof SCHEMA].map(field => {
                                      const fullPath = `${source}.${field}`;
                                      return (
                                        <div key={fullPath} className="flex items-center space-x-2 border p-2 rounded-md">
                                          <Checkbox 
                                            id={fullPath} 
                                            checked={config.fields.includes(fullPath)}
                                            onCheckedChange={() => toggleField(fullPath)}
                                          />
                                          <label htmlFor={fullPath} className="text-xs cursor-pointer select-none">{field}</label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="aggregation" className="mt-0 space-y-6">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                          <Info className="h-5 w-5 text-amber-600" />
                          <div className="text-sm">
                            <p className="font-bold text-amber-900">{t('Reports.howTotallingWorks')}</p>
                            <p className="text-amber-800">{t('Reports.howTotallingWorksDesc')}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <FormLabel>{t('Reports.groupBy')}</FormLabel>
                            <Select 
                              value={config.groupBy || 'none'} 
                              onValueChange={(v) => setConfig(p => ({...p, groupBy: v}))}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder={t('Reports.noGrouping')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('Reports.noGrouping')}</SelectItem>
                                {config.fields.map(f => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <FormLabel>{t('Reports.calculations')}</FormLabel>
                              <Button type="button" variant="outline" size="sm" onClick={addAggregation}>
                                <Plus className="h-4 w-4 mr-2" /> {t('Reports.addCalculation')}
                              </Button>
                            </div>
                            
                            {(config.aggregations || []).map((agg, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                <Select 
                                  value={agg.type} 
                                  onValueChange={(v: any) => {
                                    const newAggs = [...(config.aggregations || [])];
                                    newAggs[idx].type = v;
                                    setConfig(p => ({...p, aggregations: newAggs}));
                                  }}
                                >
                                  <SelectTrigger className="w-32 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sum">SUM</SelectItem>
                                    <SelectItem value="avg">AVG</SelectItem>
                                    <SelectItem value="count">COUNT</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Select 
                                  value={agg.field} 
                                  onValueChange={(v) => {
                                    const newAggs = [...(config.aggregations || [])];
                                    newAggs[idx].field = v;
                                    setConfig(p => ({...p, aggregations: newAggs}));
                                  }}
                                >
                                  <SelectTrigger className="flex-1 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {config.fields.map(f => (
                                      <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAggregation(idx)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="filters" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel>{t('Reports.appliedFilters')}</FormLabel>
                          <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                            <Plus className="h-4 w-4 mr-2" /> {t('Reports.addFilter')}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {config.filters.map((f, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 p-3 rounded-lg border">
                              <Select 
                                value={f.field} 
                                onValueChange={(v) => {
                                  const newFilters = [...config.filters];
                                  newFilters[idx].field = v;
                                  setConfig(p => ({...p, filters: newFilters}));
                                }}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.fields.map(field => (
                                    <SelectItem key={field} value={field}>{field}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select 
                                value={f.operator} 
                                onValueChange={(v: any) => {
                                  const newFilters = [...config.filters];
                                  newFilters[idx].operator = v;
                                  setConfig(p => ({...p, filters: newFilters}));
                                }}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">CONTAINS</SelectItem>
                                  <SelectItem value="equals">EQUALS</SelectItem>
                                  <SelectItem value="not_equals">NOT EQUALS</SelectItem>
                                  <SelectItem value="gt">GREATER THAN</SelectItem>
                                  <SelectItem value="lt">LESS THAN</SelectItem>
                                  <SelectItem value="is_not_empty">IS NOT EMPTY</SelectItem>
                                </SelectContent>
                              </Select>

                              <Input 
                                value={f.value} 
                                onChange={(e) => {
                                  const newFilters = [...config.filters];
                                  newFilters[idx].value = e.target.value;
                                  setConfig(p => ({...p, filters: newFilters}));
                                }}
                                className="bg-white"
                                placeholder={t('Reports.selectValue')}
                                disabled={f.operator === 'is_not_empty'}
                              />

                              <Button type="button" variant="ghost" size="icon" className="justify-self-end" onClick={() => removeFilter(idx)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {config.filters.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground italic border-2 border-dashed rounded-lg">
                              {t('Reports.noFiltersDesc')}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{t('Reports.configSummary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Reports.source')}</span>
                        <span className="font-bold text-primary">{t(`Reports.dataSources.${config.primaryDataSource}`)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Reports.columns')}</span>
                        <span className="font-bold">{config.fields.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Reports.filters')}:</span>
                        <span className="font-bold">{config.filters.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Reports.aggregations')}</span>
                        <span className="font-bold">{(config.aggregations || []).length}</span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={() => runReport(config)}
                      disabled={isCalculating}
                    >
                      {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('Reports.updatePreview')}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6 text-xs text-muted-foreground space-y-2">
                    <p className="font-bold text-primary italic">{t('Reports.proTip')}</p>
                    <p>{t('Reports.proTipText')}</p>
                  </CardContent>
                </Card>
              </div>
            </form>
          </Form>

          {reportResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 py-8">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold">{t('Reports.previewTitle', { count: reportResult.data.length })}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase border border-green-200">
                  {t('Reports.realTime')}
                </span>
              </div>
              <ReportResultTable columns={reportResult.columns} data={reportResult.data} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
