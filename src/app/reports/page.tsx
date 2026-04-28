'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Client, Contact, Opportunity, ProductOrService, Contract, PurchaseOrder, Service, Equipment, Activity, Location } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, Sparkles, Database, FileSpreadsheet, Trash2, History } from 'lucide-react';
import { processReportQuery } from '@/ai/flows/report-ai-flow';
import { runReportEngine } from '@/lib/reports-engine';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ReportResultTable } from '@/components/reports/report-result-table';
import { useToast } from '@/hooks/use-toast';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
  data?: {
    results: any[];
    columns: any[];
  };
  isError?: boolean;
};

const SCHEMA_DESCRIPTION = `
Entities and Fields:
- clients: name, cuit, sector, subsector, status, holding, countryHQ
- contacts: name, position, area
- opportunities: title, stage, value, currency, probability, closeDate, risk
- contracts: publicId, type, status, amount, currency, startDate, endDate
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
    content: 'Hola. Soy tu asistente de reportes IA. ¿Qué información necesitas consultar hoy? Puedo analizar contratos, facturación, servicios o clientes de tu gerencia.'
  }]);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stabilized data fetching
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
    if (!input.trim() || isAiLoading) return;

    const userText = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText } as ChatMessage];
    setMessages(newMessages);
    setIsAiLoading(true);

    try {
      const response = await processReportQuery({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        schemaContext: SCHEMA_DESCRIPTION
      });

      let dataResults = undefined;

      if (response.type === 'config' && response.config) {
        const processed = runReportEngine(response.config, collectionsMap);
        if (processed) {
          dataResults = {
            results: processed.data,
            columns: processed.columns
          };
        }
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
            <h2 className="text-xl font-bold">Asistente de Inteligencia Comercial</h2>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Powered by Gemini 2.5</p>
          </div>
        </div>
      }>
        <Button variant="ghost" size="sm" onClick={() => setMessages([{ role: 'model', content: 'Chat reiniciado. ¿En qué puedo ayudarte?' }])}>
          <History className="h-4 w-4 mr-2" /> Reiniciar Chat
        </Button>
      </AppHeader>

      <div className="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "flex gap-3 max-w-[85%] sm:max-w-[70%]",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-full shrink-0 flex items-center justify-center border",
                    msg.role === 'user' ? "bg-white text-slate-400" : "bg-primary text-white"
                  )}>
                    {msg.role === 'user' ? <Database className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 rounded-tl-none border border-slate-200",
                    msg.isError && "border-destructive text-destructive bg-destructive/5"
                  )}>
                    {msg.content}
                  </div>
                </div>

                {msg.data && msg.data.results.length > 0 && (
                  <div className="mt-4 w-full animate-in zoom-in-95 duration-500 delay-200">
                    <Card className="border-primary/20 shadow-md">
                      <CardContent className="p-0">
                         <div className="bg-primary/5 p-3 border-b flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Resultados del análisis</span>
                            <Badge variant="outline" className="bg-white">{msg.data.results.length} registros</Badge>
                         </div>
                         <ReportResultTable 
                            columns={msg.data.columns} 
                            data={msg.data.results} 
                         />
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
                  <span className="text-xs text-muted-foreground italic">Analizando base de datos...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-8 bg-white border-t mt-auto shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="relative max-w-4xl mx-auto group">
            <Input 
              placeholder="Ej: Muéstrame un reporte de facturación por cliente de este año..."
              className="h-14 pl-6 pr-24 text-base rounded-2xl border-2 border-slate-200 focus-visible:ring-primary focus-visible:border-primary transition-all bg-slate-50 hover:bg-white"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isAiLoading}
            />
            <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
               <Button 
                onClick={handleSend} 
                disabled={isAiLoading || !input.trim()}
                className="h-10 px-4 rounded-xl shadow-lg shadow-primary/20"
               >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline ml-2">Consultar</span>
               </Button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4 uppercase font-bold tracking-widest opacity-50">
            El asistente solo procesa datos que tu gerencia tiene permitidos visualizar.
          </p>
        </div>
      </div>
    </div>
  );
}
