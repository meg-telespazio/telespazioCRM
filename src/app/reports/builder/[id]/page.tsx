
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
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
  CheckCircle2, 
  Database, 
  Columns, 
  Sigma, 
  Filter as FilterIcon, 
  ArrowUpDown,
  Plus,
  Trash2,
  ChevronRight
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

// Helper to set nested property in an object
const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
};

// Available Fields Schema for the Builder
const SCHEMA = {
  clients: ['name', 'cuit', 'industry', 'status', 'email', 'phone', 'holding'],
  contacts: ['name', 'position', 'area'],
  opportunities: ['title', 'stage', 'value', 'currency', 'probability', 'closeDate'],
  contracts: ['publicId', 'type', 'status', 'amount', 'currency', 'startDate', 'endDate'],
  purchaseOrders: ['id', 'amount', 'currency', 'status', 'emissionDate'],
  services: ['serviceNickname', 'serviceLineNumber', 'servicePlan', 'monthlyFee', 'currency', 'serviceAllocationGb'],
  equipment: ['userTerminal', 'id', 'type', 'physicalStatus'],
  activities: ['type', 'description', 'isPriority'],
  locations: ['name', 'type', 'city', 'province']
};

export default function ReportManualBuilderPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { toast } = useToast();

  const reportId = params.id as string;
  const isNew = reportId === 'new';

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('source');
  
  const [config, setConfig] = useState<ReportConfig>({
    primaryDataSource: 'services',
    fields: ['services.serviceNickname', 'clients.name', 'services.monthlyFee'],
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

  // Data Collections for processing
  const baseQuery = useMemo(() => (user ? where('createdBy', '==', user.uid) : null), [user]);
  const { data: clients } = useCollection<Client>(useMemo(() => baseQuery ? query(collection(firestore, 'clients'), baseQuery) : null, [firestore, baseQuery]));
  const { data: contacts } = useCollection<Contact>(useMemo(() => baseQuery ? query(collection(firestore, 'contacts'), baseQuery) : null, [firestore, baseQuery]));
  const { data: opportunities } = useCollection<Opportunity>(useMemo(() => baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null, [firestore, baseQuery]));
  const { data: ps } = useCollection<ProductOrService>(useMemo(() => baseQuery ? query(collection(firestore, 'productsAndServices'), baseQuery) : null, [firestore, baseQuery]));
  const { data: contracts } = useCollection<Contract>(useMemo(() => baseQuery ? query(collection(firestore, 'contracts'), baseQuery) : null, [firestore, baseQuery]));
  const { data: pos } = useCollection<PurchaseOrder>(useMemo(() => baseQuery ? query(collection(firestore, 'purchaseOrders'), baseQuery) : null, [firestore, baseQuery]));
  const { data: services } = useCollection<Service>(useMemo(() => baseQuery ? query(collection(firestore, 'services'), baseQuery) : null, [firestore, baseQuery]));
  const { data: equipment } = useCollection<Equipment>(useMemo(() => baseQuery ? query(collection(firestore, 'equipment'), baseQuery) : null, [firestore, baseQuery]));
  const { data: activities } = useCollection<Activity>(useMemo(() => baseQuery ? query(collection(firestore, 'activities'), baseQuery) : null, [firestore, baseQuery]));
  const { data: locations } = useCollection<Location>(useMemo(() => baseQuery ? query(collection(firestore, 'locations'), baseQuery) : null, [firestore, baseQuery]));

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
    
    const sourceData = (collectionsMap as any)[reportConfig.primaryDataSource];
    if (!sourceData) return;

    // 1. Join Logic - Handle multi-level relationships
    const processed = sourceData.map((item: any) => {
      const row: any = { [reportConfig.primaryDataSource]: item };
      
      // Auto-join Client if exists directly
      if (item.clientId && collectionsMap.clients) {
        row.clients = collectionsMap.clients.find(c => c.id === item.clientId);
      }

      // Chain for services: Services -> PO -> Contract -> Client
      if (reportConfig.primaryDataSource === 'services') {
        if (collectionsMap.purchaseOrders) {
          const po = collectionsMap.purchaseOrders.find(p => p.id === item.poId);
          if (po) {
            row.purchaseOrders = po;
            if (collectionsMap.contracts) {
              const contract = collectionsMap.contracts.find(c => c.id === po.contractId);
              if (contract) {
                row.contracts = contract;
                if (collectionsMap.clients) {
                  row.clients = collectionsMap.clients.find(c => c.id === contract.clientId);
                }
              }
            }
          }
        }
        if (collectionsMap.equipment) {
            row.equipment = collectionsMap.equipment.find(e => e.id === item.equipmentId);
        }
      }

      // Chain for POs: PO -> Contract -> Client
      if (reportConfig.primaryDataSource === 'purchaseOrders' && collectionsMap.contracts) {
        const contract = collectionsMap.contracts.find(c => c.id === item.contractId);
        if (contract) {
          row.contracts = contract;
          if (collectionsMap.clients) {
            row.clients = collectionsMap.clients.find(c => c.id === contract.clientId);
          }
        }
      }

      return row;
    });

    // 2. Filter Logic
    let filtered = processed;
    if (reportConfig.filters?.length) {
      filtered = processed.filter((item: any) => {
        return reportConfig.filters.every(f => {
          const [source, field] = f.field.split('.');
          const val = item[source]?.[field];
          if (val === undefined || val === null) return false;
          
          const stringVal = String(val).toLowerCase();
          const stringFilter = String(f.value).toLowerCase();

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

    // 3. Aggregation & Grouping Logic
    let finalData = filtered;
    let finalColumns = reportConfig.fields.map(fKey => {
      const [source, field] = fKey.split('.');
      return { accessorKey: fKey, header: `${source}.${field}` };
    });

    if (reportConfig.aggregations?.length && reportConfig.groupBy) {
      const groups = new Map<string, any>();
      const [groupSource, groupField] = reportConfig.groupBy.split('.');

      filtered.forEach((row: any) => {
        const groupKey = String(row[groupSource]?.[groupField] || 'N/A');
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { _key: groupKey, _records: [] });
        }
        groups.get(groupKey)._records.push(row);
      });

      finalData = Array.from(groups.values()).map(group => {
        const aggregatedRow: any = {};
        setNestedValue(aggregatedRow, reportConfig.groupBy!, group._key);

        reportConfig.aggregations!.forEach(agg => {
          const [aggSource, aggField] = agg.field.split('.');
          const values = group._records.map((r: any) => Number(r[aggSource]?.[aggField] || 0));
          
          let result = 0;
          if (agg.type === 'sum') result = values.reduce((a: number, b: number) => a + b, 0);
          else if (agg.type === 'avg') result = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
          else if (agg.type === 'count') result = group._records.length;

          aggregatedRow[`${agg.field}_${agg.type}`] = result;
        });
        return aggregatedRow;
      });

      finalColumns = [
        { accessorKey: reportConfig.groupBy, header: `Agrupado por: ${reportConfig.groupBy}` },
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
  }, [collectionsMap]);

  // Run report when config is set or changed
  useEffect(() => {
    if (config && mounted) {
      runReport(config);
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
  const relatedOptions = ['clients', 'contracts', 'purchaseOrders', 'equipment'].filter(o => o !== config.primaryDataSource);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={isNew ? t('Reports.createNew') : t('Actions.editReport')}>
        <Button variant="outline" onClick={() => router.push('/reports')}>
          {t('Auth.cancelLabel')}
        </Button>
        <Button onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
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
                        <FormControl><Input {...field} placeholder="Ej: Resumen de Abonos Mensuales" /></FormControl>
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

                <Card className="shadow-md">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <CardHeader className="border-b bg-slate-50/50 p-0">
                      <TabsList className="w-full justify-start rounded-none bg-transparent h-12">
                        <TabsTrigger value="source" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2">
                          <Database className="h-4 w-4" /> {t('Reports.dataSource')}
                        </TabsTrigger>
                        <TabsTrigger value="fields" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2">
                          <Columns className="h-4 w-4" /> {t('Reports.step3')}
                        </TabsTrigger>
                        <TabsTrigger value="aggregation" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2">
                          <Sigma className="h-4 w-4" /> Agregaciones
                        </TabsTrigger>
                        <TabsTrigger value="filters" className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary px-6 h-full flex gap-2">
                          <FilterIcon className="h-4 w-4" /> Filtros
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      {/* STEP 2: SOURCE */}
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

                      {/* STEP 3: FIELDS */}
                      <TabsContent value="fields" className="mt-0 space-y-6">
                        <div className="space-y-6">
                          {/* Campos de la Tabla Principal */}
                          <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                              <Badge variant="outline">{t(`Reports.dataSources.${config.primaryDataSource}`)}</Badge>
                              Tabla Principal
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

                          {/* Campos de Tablas Relacionadas (Joins) */}
                          <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                              <Badge variant="secondary">Relaciones</Badge>
                              Tablas Vinculadas
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

                      {/* STEP 4: AGGREGATION */}
                      <TabsContent value="aggregation" className="mt-0 space-y-6">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                          <Sigma className="h-5 w-5 text-amber-600" />
                          <div className="text-sm">
                            <p className="font-bold text-amber-900">¿Cómo funcionan los totales?</p>
                            <p className="text-amber-800">Selecciona un campo para agrupar (ej: Cliente) y luego añade cálculos para otros campos (ej: Suma de Abono).</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <FormLabel>Agrupar por:</FormLabel>
                            <Select 
                              value={config.groupBy || ''} 
                              onValueChange={(v) => setConfig(p => ({...p, groupBy: v}))}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Sin agrupamiento (Detalle completo)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin agrupamiento</SelectItem>
                                {config.fields.map(f => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <FormLabel>Cálculos (Totales):</FormLabel>
                              <Button type="button" variant="outline" size="sm" onClick={addAggregation}>
                                <Plus className="h-4 w-4 mr-2" /> Añadir Cálculo
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
                                    <SelectItem value="sum">SUMA</SelectItem>
                                    <SelectItem value="avg">PROMEDIO</SelectItem>
                                    <SelectItem value="count">CONTAR</SelectItem>
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

                      {/* STEP 5: FILTERS */}
                      <TabsContent value="filters" className="mt-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel>Filtros aplicados:</FormLabel>
                          <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                            <Plus className="h-4 w-4 mr-2" /> Añadir Filtro
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
                                  <SelectItem value="contains">Contiene</SelectItem>
                                  <SelectItem value="equals">Es igual a</SelectItem>
                                  <SelectItem value="gt">Mayor que</SelectItem>
                                  <SelectItem value="lt">Menor que</SelectItem>
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
                                placeholder="Valor..."
                              />

                              <Button type="button" variant="ghost" size="icon" className="justify-self-end" onClick={() => removeFilter(idx)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {config.filters.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground italic border-2 border-dashed rounded-lg">
                              Sin filtros. Se mostrarán todos los registros.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              </div>

              {/* BARRA LATERAL: RESUMEN Y CONFIG */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Configuración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fuente:</span>
                        <span className="font-bold text-primary">{config.primaryDataSource}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Columnas:</span>
                        <span className="font-bold">{config.fields.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filtros:</span>
                        <span className="font-bold">{config.filters.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agregaciones:</span>
                        <span className="font-bold">{(config.aggregations || []).length}</span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      className="w-full" 
                      onClick={() => runReport(config)}
                    >
                      Actualizar Vista Previa
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6 text-xs text-muted-foreground space-y-2">
                    <p className="font-bold text-primary italic">💡 Consejo Profesional:</p>
                    <p>Si quieres ver el total facturado por cliente, selecciona <b>Servicios</b> como fuente, añade el campo <b>clients.name</b> y usa una agregación <b>SUMA</b> sobre <b>services.monthlyFee</b> agrupando por el nombre del cliente.</p>
                  </CardContent>
                </Card>
              </div>
            </form>
          </Form>

          {/* VISTA PREVIA DE RESULTADOS */}
          {reportResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 py-8">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold">Vista Previa ({reportResult.data.length} registros)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase border border-green-200">
                  Ejecutando en tiempo real
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
