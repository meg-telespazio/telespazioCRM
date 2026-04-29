'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, limit } from 'firebase/firestore';
import type { Client, Contact, Opportunity, ProductOrService, Contract, PurchaseOrder, Service, Equipment, Activity, Location, SystemConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, Sparkles, Database, History, Download, CheckCircle2, ShieldAlert } from 'lucide-react';
import { processReportQuery } from '@/ai/flows/report-ai-flow';
import { runReportEngine } from '@/lib/reports-engine';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ReportResultTable } from '@/components/reports/report-result-table';
import { useToast } from '@/hooks/use-toast';
import { logAiUsage } from '@/lib/metrics';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
  data?: {
    results: any[];
    columns: any[];
    isQuantitative: boolean;
  };
  isError?: boolean;
  isUnauthorized?: boolean;
};

const SCHEMA_DESCRIPTION = `
- clients: name, cuit, sector, subsector, status, holding, countryHQ
- contacts: name, position, area
- opportunities: title, stage, value, currency, probability, closeDate, risk, opportunityType
- contracts: publicId, type, status, amount, currency, startDate, endDate, costCenterId
- purchaseOrders: poNumber, amount, currency, status, emissionDate
- services: serviceNickname, serviceLineNumber, servicePlan, monthlyFee, currency, status
- equipment: userTerminal, id, type, physicalStatus
- activities: type, description, isPriority, dueDate
- locations: name, type, city, province, country
`;

export default function AIReportsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'model',
    content: 'Hola. Soy tu asistente analítico de Telespazio. Puedo ayudarte con estadísticas de facturación, estado de contratos o prospección de negocios. ¿Qué necesitas consultar?'
  }]);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Permisos y Configuración
  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'systemConfig', 'globals') : null, [firestore]);
  const { data: systemConfig } = useDoc<SystemConfig>(configDocRef);

  // Queries base filtradas por Gerencia para el motor local
  const getQ = (name: string) => {
    if (!user) return null;
    const ref = collection(firestore, name);
    return user.role === 'admin' ? query(ref) : query(ref, where('management', '==', user.management));
  };

  const { data: clients } = useCollection<Client>(getQ('clients'));
  const { data: contacts } = useCollection<Contact>(getQ('contacts'));
  const { data: opportunities } = useCollection<Opportunity>(getQ('opportunities'));
  const { data: ps } = useCollection<ProductOrService>(getQ('productsAndServices'));
  const { data: contracts } = useCollection<Contract>(getQ('contracts'));
  const { data: pos } = useCollection<PurchaseOrder>(getQ('purchaseOrders'));
  const { data: services } = useCollection<Service>(getQ('services'));
  const { data: equipment } = useCollection<Equipment>(getQ('equipment'));
  const { data: activities } = useCollection<Activity>(getQ('activities'));
  const { data: locations } = useCollection<Location>(getQ('locations'));

  const collectionsMap = {
    clients, contacts, opportunities, productsAndServices: ps, contracts, purchaseOrders: pos, services, equipment, activities, locations
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isAiLoading || !user || !systemConfig) return;

    const userText = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText } as ChatMessage];
    setMessages(newMessages);
    setIsAiLoading(true);

    try {
      const response = await processReportQuery({
        messages: newMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        schemaContext: SCHEMA_DESCRIPTION,
        userRole: user.role,
        userManagement: user.management || '',
        permissionsMatrix: systemConfig.permissionsMatrix || {}
      });

      // Registro de métricas y costos
      await logAiUsage(firestore, 'gemini-2.5-flash', userText, response.text, user.uid);

      if (response.type === 'unauthorized') {
        setMessages(prev => [...prev, {
          role: 'model',
          content: response.text,
          isUnauthorized: true
        }]);
        setIsAiLoading(false);
        return;
      }

      let dataResults = undefined;
      if (response.type === 'config' && response.config) {
        const processed = runReportEngine(response.config, collectionsMap);
        if (processed) {
          const isQuantitative = (response.config.aggregations || []).length > 0;
          dataResults = {
            results: processed.data,
            columns: processed.columns,
            isQuantitative
          };
        }
      }

      // Guardar en el historial de Firestore
      if (response.summary) {
        await addDoc(collection(firestore, 'chat_history'), {
          userId: user.uid,
          userEmail: user.email,
          summary: response.summary,
          lastQuestion: userText,
          timestamp: serverTimestamp()
        });
      }

      setMessages(prev => [...prev, {
        role: 'model',
        content: response.text,
        data: dataResults
      }]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error de IA', description: e.message });
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Lo siento, ocurrió un error procesando tu solicitud.',
        isError: true
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      <AppHeader title={
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Asistente Analítico</h2>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">IA Con acceso a datos en tiempo real</p>
          </div>
        </div>
      }>
        <Button variant="ghost" size="sm" onClick={() => setMessages([{ role: 'model', content: 'Chat reiniciado. ¿En qué puedo ayudarte hoy?' }])}>
          <History className="h-4 w-4 mr-2" /> Reiniciar
        </Button>
      </AppHeader>

      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "flex gap-3 max-w-[90%] sm:max-w-[80%]",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-full shrink-0 flex items-center justify-center border shadow-sm",
                    msg.role === 'user' ? "bg-white text-slate-400" : "bg-primary text-white"
                  )}>
                    {msg.role === 'user' ? <Database className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 rounded-tl-none border border-slate-200",
                    msg.isError && "border-destructive text-destructive bg-destructive/5",
                    msg.isUnauthorized && "border-amber-400 bg-amber-50 text-amber-900"
                  )}>
                    {msg.isUnauthorized && <ShieldAlert className="h-4 w-4 mb-2" />}
                    {msg.content}
                  </div>
                </div>

                {msg.data && msg.data.results.length > 0 && (
                  <div className="mt-4 w-full animate-in zoom-in-95 duration-500 delay-150">
                    <Card className="border-slate-200 shadow-xl">
                      <CardContent className="p-0">
                         {msg.data.isQuantitative ? (
                            <div className="p-6 bg-primary/5 text-center">
                               <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Resultado de Análisis</p>
                               <div className="text-4xl font-black text-slate-900">
                                  {msg.data.results[0][msg.data.columns[0].accessorKey]?.toLocaleString() || '0'}
                               </div>
                            </div>
                         ) : (
                            <>
                               <div className="bg-slate-50 p-3 border-b flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registros Detectados</span>
                                  <Badge variant="outline" className="bg-white">{msg.data.results.length} registros</Badge>
                               </div>
                               <ReportResultTable 
                                  columns={msg.data.columns} 
                                  data={msg.data.results} 
                               />
                            </>
                         )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ))}
            {isAiLoading && (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <span className="text-xs text-muted-foreground italic">Validando accesos y procesando datos...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-8 bg-white border-t mt-auto shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="relative max-w-4xl mx-auto">
            <Input 
              placeholder="Ej: ¿Cuál es la facturación total en USD este mes?"
              className="h-14 pl-6 pr-24 text-base rounded-2xl border-2 border-slate-100 focus-visible:ring-primary focus-visible:ring-offset-0 transition-all bg-slate-50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isAiLoading}
            />
            <div className="absolute right-2 top-2 bottom-2 flex items-center">
               <Button 
                onClick={handleSend} 
                disabled={isAiLoading || !input.trim()}
                className="h-10 px-4 rounded-xl shadow-lg"
               >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline ml-2">Analizar</span>
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
