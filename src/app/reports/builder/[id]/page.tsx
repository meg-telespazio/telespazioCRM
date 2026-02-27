
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client, Contact, Opportunity, ProductOrService, Report, ReportConfig, ReportFilter, ReportSort, Contract, PurchaseOrder, Service, Equipment, Activity, Location } from '@/lib/types';
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
import { Loader2, Send, Bot, User, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processReportQuery } from '@/ai/flows/report-ai-flow';
import backendSchema from '../../../../../docs/backend.json';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(3, t('Reports.validation.nameMin')),
    description: z.string().optional(),
  });

type ReportFormData = z.infer<ReturnType<typeof getFormSchema>>;

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function ReportAIBuilderPage() {
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

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
  const [reportResult, setReportResult] = useState<{ data: any[]; columns: any[] } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setReportConfig(existingReport.config);
      if (shouldRunOnLoad) {
        // Trigger report execution
      }
    }
  }, [existingReport, form, shouldRunOnLoad]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const runReport = useCallback((config: ReportConfig) => {
    if (!config || !collectionsMap) return;
    
    const sourceData = (collectionsMap as any)[config.primaryDataSource];
    if (!sourceData) return;

    // Simplified Join Logic
    const processed = sourceData.map((item: any) => {
      const row: any = { [config.primaryDataSource]: item };
      // Basic Joins
      if (item.clientId && collectionsMap.clients) {
        row.clients = collectionsMap.clients.find(c => c.id === item.clientId);
      }
      if (item.contactId && collectionsMap.contacts) {
        row.contacts = collectionsMap.contacts.find(c => c.id === item.contactId);
      }
      if (item.poId && collectionsMap.purchaseOrders) {
        row.purchaseOrders = collectionsMap.purchaseOrders.find(p => p.id === item.poId);
      }
      return row;
    });

    // Filters
    let filtered = processed;
    if (config.filters?.length) {
      filtered = processed.filter((item: any) => {
        return config.filters.every(f => {
          const [source, field] = f.field.split('.');
          const val = item[source]?.[field];
          if (val === undefined) return false;
          switch (f.operator) {
            case 'contains': return String(val).toLowerCase().includes(String(f.value).toLowerCase());
            case 'equals': return String(val) === String(f.value);
            case 'gt': return val > f.value;
            case 'lt': return val < f.value;
            default: return true;
          }
        });
      });
    }

    // Map Columns
    const columns = config.fields.map(fKey => {
      const [source, field] = fKey.split('.');
      return { accessorKey: fKey, header: `${source}.${field}` };
    });

    setReportResult({ data: filtered, columns });
  }, [collectionsMap]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsProcessing(true);

    try {
      const response = await processReportQuery({
        messages: newMessages,
        schemaContext: JSON.stringify(backendSchema),
      });

      setMessages([...newMessages, { role: 'model', content: response.text }]);
      if (response.type === 'config' && response.config) {
        setReportConfig(response.config);
        runReport(response.config);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error processing request' });
    } finally {
      setIsProcessing(false);
    }
  };

  async function handleSave(values: ReportFormData) {
    if (!user || !reportConfig) return;
    setIsSaving(true);
    try {
      if (isNew) {
        const newReportRef = await addReport(firestore, user.uid, { ...values, config: reportConfig });
        toast({ variant: 'success', title: t('Reports.saveSuccess') });
        router.replace(`/reports/builder/${newReportRef.id}`);
      } else {
        await updateReport(firestore, user.uid, reportId, { ...values, config: reportConfig });
        toast({ variant: 'success', title: t('Reports.updateSuccess') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t('Reports.saveError') });
    } finally {
      setIsSaving(false);
    }
  }

  if (userLoading || reportLoading || !mounted) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6"><Skeleton className="h-96 w-full" /></main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={isNew ? t('Reports.createNew') : t('Actions.editReport')} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t('Reports.reportName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>{t('Reports.reportDescription')}</FormLabel><FormControl><Textarea {...field} rows={1} className="min-h-0" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <Card className="flex flex-col h-[500px]">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> Asistente de Reportes IA</CardTitle>
                  <CardDescription>Explícale a la IA qué datos quieres ver y ella armará el reporte por ti.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>¿Qué tipo de reporte necesitas hoy?</p>
                          <p className="text-xs">Ej: "Quiero un listado de clientes con servicios activos y su abono mensual"</p>
                        </div>
                      )}
                      {messages.map((m, i) => (
                        <div key={i} className={cn("flex gap-3 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback>{m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</AvatarFallback>
                          </Avatar>
                          <div className={cn("rounded-lg px-3 py-2 text-sm", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="flex gap-3 items-center text-muted-foreground animate-pulse">
                          <Bot className="h-4 w-4" />
                          <span className="text-xs">Procesando consulta...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t bg-background">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Describe tu reporte..." 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        className="bg-white"
                      />
                      <Button onClick={handleSendMessage} disabled={isProcessing || !userInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/reports')}>{t('Auth.cancelLabel')}</Button>
                <Button type="submit" disabled={isSaving || !reportConfig}>
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {t('Reports.saveReport')}
                </Button>
              </div>
            </form>
          </Form>

          {reportConfig && reportResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Vista Previa de Resultados</h3>
                <Badge variant="outline" className="bg-green-50 text-green-700">Configuración Generada</Badge>
              </div>
              <ReportResultTable columns={reportResult.columns} data={reportResult.data} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Badge = ({ children, variant, className }: any) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", variant === 'outline' ? "border" : "", className)}>{children}</span>
);
