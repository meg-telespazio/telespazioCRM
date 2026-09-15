'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/firebase/client-provider';
import type { Client, Service, Equipment, Contract, PurchaseOrder } from '@/lib/types';
import { Download, FileSpreadsheet, Loader2, ListChecks, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface PreBillingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  services: Service[];
  equipment: Equipment[];
  contracts: Contract[];
  pos: PurchaseOrder[];
}

export function PreBillingModal({
  isOpen,
  onOpenChange,
  client,
  services,
  equipment,
  contracts,
  pos,
}: PreBillingModalProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const [isExporting, setIsExporting] = useState(false);

  // Requerimiento: Solo servicios activos
  const activeServices = useMemo(() => {
    return services.filter(s => s.status === 'active' || !s.status);
  }, [services]);

  const billingData = useMemo(() => {
    return activeServices.map(service => {
      const equip = equipment.find(e => e.id === service.equipmentId);
      
      const equipmentFee = (!equip?.isClientOwned) ? (equip?.comodatoFee || 0) : 0;
      const serviceFee = service.monthlyFee || 0;

      return {
        id: service.id,
        nickname: service.serviceNickname,
        lineNumber: service.serviceLineNumber,
        plan: service.servicePlan || 'Sin Plan',
        currency: service.currency || 'USD',
        serviceFee,
        equipmentFee,
        total: serviceFee + equipmentFee,
      };
    });
  }, [activeServices, equipment]);

  // Totales por Tipo de Plan
  const totalsByPlan = useMemo(() => {
    const planMap = new Map<string, { count: number, total: number, currency: string }>();
    
    billingData.forEach(item => {
      const current = planMap.get(item.plan) || { count: 0, total: 0, currency: item.currency };
      planMap.set(item.plan, {
        count: current.count + 1,
        total: current.total + item.total,
        currency: item.currency
      });
    });

    return Array.from(planMap.entries()).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.total - a.total);
  }, [billingData]);

  const grandTotals = useMemo(() => {
    return billingData.reduce((acc, curr) => {
      acc.services += curr.serviceFee;
      acc.equipment += curr.equipmentFee;
      acc.grandTotal += curr.total;
      return acc;
    }, { services: 0, equipment: 0, grandTotal: 0 });
  }, [billingData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      
      const data = billingData.map(item => ({
        'Ítem / Nickname': item.nickname,
        'Línea de Servicio': item.lineNumber,
        'Plan': item.plan,
        'Abono Servicio': item.serviceFee,
        'Abono Equipo (Comodato)': item.equipmentFee,
        'Total Fila': item.total,
        'Moneda': item.currency
      }));

      // Separador
      data.push({} as any);
      data.push({ 'Ítem / Nickname': 'RESUMEN POR PLANES' } as any);

      totalsByPlan.forEach(p => {
        data.push({
          'Ítem / Nickname': p.name,
          'Línea de Servicio': `${p.count} servicios`,
          'Total Fila': p.total,
          'Moneda': p.currency
        } as any);
      });

      // Totales finales
      data.push({} as any);
      data.push({
        'Ítem / Nickname': 'TOTAL GENERAL',
        'Total Fila': grandTotals.grandTotal,
        'Moneda': billingData[0]?.currency || 'USD'
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pre-billing");
      XLSX.writeFile(workbook, `PreBilling_${client.name}_${format(new Date(), 'yyyy-MM')}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 border-b bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-xl shadow-lg">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">{t('PreBilling.title')}</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                {client.name} • Periodo: <span className="capitalize">{format(new Date(), 'MMMM yyyy', { locale: dateLocale })}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 scrollbar-hide">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-none h-10">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">{t('PreBilling.serviceHeader')}</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">{t('PreBilling.planHeader')}</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">{t('PreBilling.serviceFeeHeader')}</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">{t('PreBilling.equipmentFeeHeader')}</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500">{t('PreBilling.totalHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 h-10 border-b border-slate-50">
                    <TableCell className="py-2">
                      <div className="font-bold text-slate-800 text-[11px]">{item.nickname}</div>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.lineNumber}</p>
                    </TableCell>
                    <TableCell className="py-2 text-[11px] font-medium text-slate-600">
                      {item.plan}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="font-bold text-[11px]">{item.serviceFee.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">{item.currency}</span></span>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {item.equipmentFee > 0 ? (
                        <span className="text-blue-600 font-bold text-[11px]">{item.equipmentFee.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">{item.currency}</span></span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="font-black text-primary text-[11px]">{item.total.toLocaleString()} <span className="text-[9px] font-normal">{item.currency}</span></span>
                    </TableCell>
                  </TableRow>
                ))}
                {billingData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center italic text-slate-400 text-sm">
                      No se detectaron servicios activos para facturar en este cliente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Desglose por tipo de servicio */}
          {totalsByPlan.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Desglose por Plan de Servicio
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {totalsByPlan.map(plan => (
                  <Card key={plan.name} className="border-none shadow-sm bg-white">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-[10px] font-black text-slate-400 uppercase truncate pr-2">{plan.name}</p>
                        <p className="text-lg font-black text-slate-800">{plan.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">{plan.currency}</span></p>
                      </div>
                      <Badge variant="secondary" className="h-6 px-2 bg-slate-100 text-slate-600 font-bold">x{plan.count}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de Totales Finales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
            <div className="p-5 rounded-2xl bg-white border shadow-sm space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Abonos Servicios</span>
              <p className="text-2xl font-black text-slate-800">
                {grandTotals.services.toLocaleString()} <span className="text-sm font-normal text-slate-400">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border shadow-sm space-y-1 border-blue-100">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Total Abonos Equipos</span>
              <p className="text-2xl font-black text-blue-700">
                {grandTotals.equipment.toLocaleString()} <span className="text-sm font-normal text-slate-400">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-primary shadow-xl shadow-primary/20 space-y-1">
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest block">Total General Facturable</span>
              <p className="text-2xl font-black text-white">
                {grandTotals.grandTotal.toLocaleString()} <span className="text-sm font-normal text-white/70">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-white shrink-0">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <Zap className="h-3 w-3 text-yellow-500" />
              {billingData.length} Servicios operativos detectados
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}>
                {t('Auth.cancelLabel')}
              </Button>
              <Button onClick={handleExport} disabled={billingData.length === 0 || isExporting} className="gap-2 px-8 shadow-lg shadow-primary/20">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('PreBilling.exportExcel')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}