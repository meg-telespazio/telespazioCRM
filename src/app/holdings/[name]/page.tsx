
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Service, Holding, PurchaseOrder, Contract } from '@/lib/types';
import { upsertHolding } from '@/lib/firestore/holdings';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Building,
  Save,
  LayoutGrid,
  Zap,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HoldingDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawName = decodeURIComponent(params.name as string);
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const [isEditing, setIsEditing] = useState(false);
  const [holdingName, setHoldingName] = useState(rawName);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Data fetching
  const holdingId = encodeURIComponent(rawName.trim().toLowerCase());
  const holdingDocRef = useMemo(() => firestore ? doc(firestore, 'holdings', holdingId) : null, [firestore, holdingId]);
  const { data: holding, loading: holdingLoading } = useDoc<Holding>(holdingDocRef);

  const clientsQuery = useMemo(() => user ? query(collection(firestore, 'clients'), where('holding', '==', rawName)) : null, [user, rawName, firestore]);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const servicesQuery = useMemo(() => user ? query(collection(firestore, 'services')) : null, [user, firestore]);
  const { data: allServices } = useCollection<Service>(servicesQuery);

  const posQuery = useMemo(() => user ? query(collection(firestore, 'purchaseOrders')) : null, [user, firestore]);
  const { data: allPos } = useCollection<PurchaseOrder>(posQuery);

  const contractsQuery = useMemo(() => user ? query(collection(firestore, 'contracts')) : null, [user, firestore]);
  const { data: allContracts } = useCollection<Contract>(contractsQuery);

  useEffect(() => {
    if (holding) {
      setHoldingName(holding.name);
      setDescription(holding.description || '');
    }
  }, [holding]);

  // Aggregation Logic
  const companySummaries = useMemo(() => {
    if (!clients || !allServices || !allPos || !allContracts) return [];

    return clients.map(client => {
      // Find all services for this client
      const clientContractIds = new Set(allContracts.filter(c => c.clientId === client.id).map(c => c.id));
      const clientPoIds = new Set(allPos.filter(p => clientContractIds.has(p.contractId)).map(p => p.id));
      const clientServices = allServices.filter(s => clientPoIds.has(s.poId));

      // Group services by plan
      const planGroups = new Map<string, { count: number, totalMrr: number }>();
      clientServices.forEach(s => {
        const plan = s.servicePlan || 'Sin Plan';
        const current = planGroups.get(plan) || { count: 0, totalMrr: 0 };
        planGroups.set(plan, {
          count: current.count + 1,
          totalMrr: current.totalMrr + (s.monthlyFee || 0)
        });
      });

      return {
        client,
        plans: Array.from(planGroups.entries()).map(([name, stats]) => ({ name, ...stats })),
        totalMrr: clientServices.reduce((sum, s) => sum + (s.monthlyFee || 0), 0),
        totalServices: clientServices.length
      };
    });
  }, [clients, allServices, allPos, allContracts]);

  const groupStats = useMemo(() => {
    return {
      totalCompanies: clients?.length || 0,
      totalServices: companySummaries.reduce((sum, c) => sum + c.totalServices, 0),
      totalMrr: companySummaries.reduce((sum, c) => sum + c.totalMrr, 0)
    };
  }, [clients, companySummaries]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await upsertHolding(firestore, user.uid, rawName, holdingName, description);
      toast({ variant: 'success', title: t('Actions.saveSuccess') });
      setIsEditing(false);
      if (holdingName !== rawName) {
        router.push(`/holdings/${encodeURIComponent(holdingName)}`);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = userLoading || holdingLoading || clientsLoading;

  if (isLoading) return <div className="p-6 space-y-6"><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={rawName}>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "ghost" : "default"}>
          {isEditing ? t('Auth.cancelLabel') : t('Holdings.edit')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Header / Edit Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <LayoutGrid className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <Input 
                    value={holdingName} 
                    onChange={(e) => setHoldingName(e.target.value)}
                    className="text-2xl font-bold h-12"
                  />
                ) : (
                  <CardTitle className="text-3xl font-bold">{rawName}</CardTitle>
                )}
                <CardDescription>{t('Holdings.title')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">{t('Holdings.description')}</label>
              {isEditing ? (
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Holdings.noDescription')}
                  rows={4}
                />
              ) : (
                <p className={cn("text-sm leading-relaxed", !description && "italic text-muted-foreground")}>
                  {description || t('Holdings.noDescription')}
                </p>
              )}
            </div>
            {isEditing && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('Holdings.save')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-white rounded-full border shadow-sm"><Building className="h-5 w-5 text-slate-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('Holdings.totalCompanies')}</p>
                <p className="text-xl font-bold">{groupStats.totalCompanies}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-white rounded-full border shadow-sm"><Zap className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('Holdings.totalServices')}</p>
                <p className="text-xl font-bold">{groupStats.totalServices}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-full border border-primary/20 shadow-sm text-primary font-bold">USD</div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase">{t('Holdings.totalMrr')}</p>
                <p className="text-xl font-bold text-primary">{groupStats.totalMrr.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies and Services Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {t('Holdings.companies')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border-t">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>{t('Forms.clientName')}</TableHead>
                    <TableHead>{t('Forms.servicePlan')}</TableHead>
                    <TableHead className="text-center">{t('Forms.quantity')}</TableHead>
                    <TableHead className="text-right">Total MRR (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companySummaries.length > 0 ? companySummaries.map((summary) => (
                    <React.Fragment key={summary.client.id}>
                      {summary.plans.length > 0 ? summary.plans.map((plan, idx) => (
                        <TableRow key={`${summary.client.id}-${plan.name}`} className="hover:bg-muted/10">
                          <TableCell className="font-medium">
                            {idx === 0 ? (
                              <button 
                                onClick={() => router.push(`/clients/${summary.client.id}/summary`)}
                                className="text-primary hover:underline font-bold"
                              >
                                {summary.client.name}
                              </button>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-normal">{plan.name}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono">{plan.count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {plan.totalMrr.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow key={summary.client.id} className="hover:bg-muted/10">
                          <TableCell className="font-medium">
                            <button 
                              onClick={() => router.push(`/clients/${summary.client.id}/summary`)}
                              className="text-primary hover:underline font-bold"
                            >
                              {summary.client.name}
                            </button>
                          </TableCell>
                          <TableCell className="italic text-muted-foreground text-xs" colSpan={3}>
                            Sin servicios activos
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-slate-50/50">
                        <TableCell colSpan={3} className="text-right text-[10px] font-bold uppercase text-muted-foreground">
                          Subtotal {summary.client.name}:
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {summary.totalMrr.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">
                        No hay empresas vinculadas a este holding.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import React from 'react';
