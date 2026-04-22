'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { QuoteRequest, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { 
  Mail, 
  Phone, 
  Globe, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Database, 
  User, 
  Zap, 
  Building2,
  Inbox,
  CheckCircle2,
  Clock,
  UserPlus,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  UserCheck
} from 'lucide-react';
import { 
  markQuoteRequestAsRead, 
  assignExecutiveToQuote, 
  convertQuoteToDeal 
} from '@/lib/firestore/quote-requests';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function QuoteRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : enUS;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Data fetching
  const requestsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'quoteRequests'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);

  const { data: rawRequests, loading: requestsLoading } = useCollection<QuoteRequest>(requestsQuery);
  const { data: allUsers } = useCollection<UserProfile>(usersQuery);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers?.forEach(u => map.set(u.uid, u.displayName));
    return map;
  }, [allUsers]);

  const requests = useMemo(() => {
    if (!rawRequests) return [];
    if (!showOnlyMine) return rawRequests;
    return rawRequests.filter(r => r.assignedTo === user?.uid);
  }, [rawRequests, showOnlyMine, user]);

  const selectedRequest = useMemo(() => 
    rawRequests?.find(r => r.id === selectedId), 
  [rawRequests, selectedId]);

  const executives = useMemo(() => 
    allUsers?.filter(u => u.role === 'ejecutivo' || u.role === 'admin')
      .sort((a, b) => a.displayName.localeCompare(b.displayName)) || []
  , [allUsers]);

  // Actions
  useEffect(() => {
    if (selectedId && selectedRequest && !selectedRequest.isRead) {
      markQuoteRequestAsRead(firestore, selectedId);
    }
  }, [selectedId, selectedRequest, firestore]);

  const handleAssign = async (execId: string) => {
    if (!selectedId) return;
    try {
      await assignExecutiveToQuote(firestore, selectedId, execId);
      toast({ variant: 'success', title: 'Ejecutivo asignado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al asignar' });
    }
  };

  const handleConvert = async () => {
    if (!selectedId || !selectedRequest || !user) return;
    setIsConverting(true);
    try {
      const result = await convertQuoteToDeal(firestore, selectedId, selectedRequest, user as any);
      toast({ 
        variant: 'success', 
        title: '¡Conversión Exitosa!', 
        description: 'Se ha creado el cliente y la oportunidad.' 
      });
      router.push(`/opportunities/${result.opportunityId}`);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error en la conversión', description: e.message });
    } finally {
      setIsConverting(false);
    }
  };

  if (userLoading || requestsLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'gerente';

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50/50">
      <AppHeader title="Inbox: Solicitudes de Cotización" />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: List */}
        <div className="w-full md:w-1/3 lg:w-[400px] border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-slate-50/50 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peticiones Recientes</span>
                <Badge variant="secondary" className="text-[10px]">{requests?.length || 0}</Badge>
             </div>
             <div className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
                <Label htmlFor="mine-filter-quotes" className="text-[10px] font-bold uppercase cursor-pointer">Solo mis pedidos</Label>
                <Switch 
                  id="mine-filter-quotes" 
                  checked={showOnlyMine} 
                  onCheckedChange={setShowOnlyMine}
                />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {requests?.map((req) => {
              const assignedName = req.assignedTo ? userMap.get(req.assignedTo) : null;
              return (
                <div 
                  key={req.id} 
                  onClick={() => setSelectedId(req.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:bg-slate-50 relative group",
                    selectedId === req.id ? "bg-red-50/50 border-r-4 border-r-primary" : "",
                    !req.isRead && "bg-blue-50/30"
                  )}
                >
                  {!req.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        {format(req.createdAt, 'dd MMM', { locale: dateLocale })}
                      </span>
                      {req.status === 'converted' && (
                         <Badge variant="outline" className="text-[8px] h-4 bg-green-50 text-green-700 border-green-200">CONVERTIDO</Badge>
                      )}
                    </div>
                    <h4 className={cn("text-sm truncate pr-4", !req.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                      {req.companyName}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {req.contact.firstName} {req.contact.lastName} • {req.usageLocation}
                    </p>
                    
                    {assignedName && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-primary bg-primary/5 w-fit px-2 py-0.5 rounded">
                        <UserCheck className="h-3 w-3" />
                        {assignedName.toUpperCase()}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[9px] h-4 uppercase">{req.usage}</Badge>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{req.country}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {requests?.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <Inbox className="h-10 w-10 mx-auto text-slate-200" />
                <p className="text-sm text-slate-400 italic">No hay solicitudes nuevas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detail */}
        <div className="flex-1 bg-white overflow-y-auto">
          {selectedRequest ? (
            <div className="animate-in fade-in duration-300 h-full flex flex-col">
              {/* Detail Header */}
              <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedRequest.companyName}</h2>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">{selectedRequest.legalName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {selectedRequest.status === 'converted' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-lg text-green-700 text-xs font-bold animate-in zoom-in-95">
                        <CheckCircle2 className="h-4 w-4" />
                        OPORTUNIDAD GENERADA
                        <Button variant="ghost" size="sm" className="h-7 px-2 ml-2 text-green-700 hover:bg-green-100" onClick={() => router.push(`/opportunities/${selectedRequest.convertedOpportunityId}`)}>
                          Ver <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                   ) : (
                    <>
                      <div className="flex flex-col gap-1 min-w-[200px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">Asignar Responsable</span>
                        <Select 
                          value={selectedRequest.assignedTo || ""} 
                          onValueChange={handleAssign}
                          disabled={!isAdminOrManager}
                        >
                          <SelectTrigger className="h-9 bg-white border-slate-200">
                            <SelectValue placeholder="Asignar Ejecutivo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {executives.map(e => <SelectItem key={e.uid} value={e.uid}>{e.displayName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        disabled={!selectedRequest.assignedTo || isConverting} 
                        className="h-9 bg-green-600 hover:bg-green-700 shadow-sm"
                        onClick={handleConvert}
                      >
                        {isConverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                        Avanzar a Carga
                      </Button>
                    </>
                   )}
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Client Info */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                      <User className="h-3 w-3" /> Datos del Interesado
                    </h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-4 w-4" /></div>
                         <div>
                            <p className="text-sm font-bold text-slate-700">{selectedRequest.contact.firstName} {selectedRequest.contact.lastName}</p>
                            <p className="text-xs text-muted-foreground italic">Persona de contacto</p>
                         </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-slate-50/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          <a href={`mailto:${selectedRequest.contact.email}`} className="text-primary font-medium hover:underline">{selectedRequest.contact.email}</a>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-600 font-medium">{selectedRequest.contact.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                         <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200 text-slate-500">
                           {selectedRequest.taxIdType}: {selectedRequest.taxId}
                         </Badge>
                         <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200 text-slate-500 gap-1">
                           <Globe className="h-3 w-3" /> {selectedRequest.country}
                         </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Technical Info */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Requerimiento Técnico
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg bg-blue-50/20">
                        <span className="text-[9px] font-bold text-blue-600 uppercase block mb-1">Cantidad</span>
                        <div className="flex items-center gap-2">
                           <Database className="h-4 w-4 text-blue-500" />
                           <span className="text-lg font-black text-blue-800">{selectedRequest.quantity}</span>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg bg-amber-50/20">
                        <span className="text-[9px] font-bold text-amber-600 uppercase block mb-1">Capacidad</span>
                        <div className="flex items-center gap-2">
                           <Zap className="h-4 w-4 text-amber-500" />
                           <span className="text-lg font-black text-amber-800">{selectedRequest.dataCapacityGb} <span className="text-[10px] font-normal">GB</span></span>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg bg-slate-50">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tipo de Uso</span>
                        <Badge className="uppercase text-[10px] font-bold">{selectedRequest.usage}</Badge>
                      </div>
                      <div className="p-3 border rounded-lg bg-slate-50">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Implementación</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                           <Calendar className="h-3.5 w-3.5" />
                           {selectedRequest.approxImplementationDate ? format(selectedRequest.approxImplementationDate, 'dd/MM/yyyy') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description and Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-5 rounded-xl bg-slate-900 text-white shadow-inner relative">
                       <MessageSquare className="absolute -top-3 -right-3 h-8 w-8 text-slate-800 rotate-12" />
                       <span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.2em] mb-3 block">Mensaje del Cliente</span>
                       <p className="text-sm leading-relaxed italic font-medium">"{selectedRequest.description}"</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-100 space-y-3">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <MapPin className="h-4 w-4 text-primary" />
                          Dirección de Obra
                       </div>
                       <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-bold text-slate-800">{selectedRequest.address.streetName} {selectedRequest.address.streetNumber}</p>
                          <p>{selectedRequest.address.city}, {selectedRequest.address.province}</p>
                          <p className="uppercase font-medium">{selectedRequest.address.country} ({selectedRequest.address.postalCode})</p>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t flex items-center justify-between">
                   <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      <Clock className="h-4 w-4" />
                      Recibido el {format(selectedRequest.createdAt, 'PPPP p', { locale: dateLocale })}
                      <span className="mx-2">•</span>
                      <span>Origen: {selectedRequest.discoverySource}</span>
                   </div>
                   {!isAdminOrManager && selectedRequest.assignedTo && (
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <UserPlus className="h-4 w-4" />
                        ASIGNADA A TI
                      </div>
                   )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
              <div className="p-6 bg-white rounded-full shadow-sm mb-6">
                <Inbox className="h-16 w-16 text-slate-100" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Inbox de Ventas</h3>
              <p className="text-slate-400 max-w-sm mt-2">Seleccione una solicitud de la lista para ver el requerimiento técnico y los datos de contacto.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
