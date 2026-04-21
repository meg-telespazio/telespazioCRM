'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { QuoteRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Mail, Phone, Globe, MessageSquare, MapPin, Calendar, Database, User } from 'lucide-react';

export default function QuoteRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();

  const requestsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'quoteRequests'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: requests, loading: requestsLoading } = useCollection<QuoteRequest>(requestsQuery);

  if (userLoading || requestsLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Solicitudes Externas (Inbox)" />
      
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid gap-6">
          {requests && requests.length > 0 ? (
            requests.map((req) => (
              <Card key={req.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Col 1: Header / Client */}
                    <div className="md:col-span-3 p-6 bg-slate-50 border-r">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-lg text-slate-800 leading-tight">{req.companyName}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">{req.legalName}</p>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/20 text-primary">
                          {req.taxIdType}: {req.taxId}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Globe className="h-3.5 w-3.5" />
                          {req.country}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Contact */}
                    <div className="md:col-span-3 p-6 border-r space-y-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contacto</span>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <User className="h-4 w-4 text-slate-400" />
                          {req.contact.firstName} {req.contact.lastName}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          <a href={`mailto:${req.contact.email}`} className="text-primary hover:underline">{req.contact.email}</a>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {req.contact.phone}
                        </div>
                      </div>
                    </div>

                    {/* Col 3: Request Details */}
                    <div className="md:col-span-6 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Requerimiento Técnico</span>
                         <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded italic">
                            Recibido: {req.createdAt ? format(req.createdAt, 'PPp') : '...'}
                         </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Cantidad</p>
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <Database className="h-3.5 w-3.5 text-blue-600" />
                            {req.quantity}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Capacidad</p>
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <Zap className="h-3.5 w-3.5 text-yellow-500" />
                            {req.dataCapacityGb} GB
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Uso</p>
                          <Badge variant="secondary" className="text-[9px] h-5 uppercase">{req.usage}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Implementación</p>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {req.approxImplementationDate ? format(req.approxImplementationDate, 'dd/MM/yyyy') : '-'}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded border text-xs leading-relaxed italic text-slate-600">
                        <MessageSquare className="h-3.5 w-3.5 mb-1 text-slate-400" />
                        "{req.description}"
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                          <MapPin className="h-3 w-3" />
                          Locación: {req.usageLocation}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Origen: {req.discoverySource}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex h-[50vh] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-50">
              <Mail className="h-16 w-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Inbox Vacío</h3>
              <p className="text-sm text-slate-400">No hay nuevas solicitudes de cotización.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Building2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
);
