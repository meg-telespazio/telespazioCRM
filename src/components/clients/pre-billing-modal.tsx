
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
import { useI18n } from '@/firebase/client-provider';
import type { Client, Service, Equipment, Contract, PurchaseOrder } from '@/lib/types';
import { Download, FileSpreadsheet, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, endOfMonth, startOfMonth, differenceInDays, isSameMonth, isBefore, isAfter } from 'date-fns';

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
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const billingData = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

    return services.map(service => {
      const equip = equipment.find(e => e.id === service.equipmentId);
      const po = pos.find(p => p.id === service.poId);
      const contract = contracts.find(c => c.id === po?.contractId);
      
      const equipmentFee = (!equip?.isClientOwned) ? (equip?.comodatoFee || 0) : 0;
      let serviceFee = service.monthlyFee || 0;
      let billingNote = '';
      let billingType: 'full' | 'pro-rata' | 'standby' | 'none' = 'full';

      // 1. Logic for CANCELED services
      if (service.status === 'canceled') {
        const cancelDate = service.statusUpdateDate;
        
        if (!cancelDate) {
          serviceFee = 0;
          billingType = 'none';
          billingNote = 'Sin fecha de cancelación';
        } else if (isBefore(cancelDate, monthStart)) {
          // Canceled before current month
          serviceFee = 0;
          billingType = 'none';
          billingNote = 'Cancelado previo al periodo';
        } else if (isSameMonth(cancelDate, today)) {
          // Canceled during current month: Pro-rata
          const activeDays = differenceInDays(cancelDate, monthStart) + 1;
          const dailyRate = serviceFee / daysInMonth;
          serviceFee = dailyRate * activeDays;
          billingType = 'pro-rata';
          billingNote = `Prorrateado (${activeDays} días)`;
        } else if (isAfter(cancelDate, monthEnd)) {
          // Canceled after current month
          billingType = 'full';
        }
      }

      // 2. Logic for PAUSED services (Standby)
      else if (service.status === 'paused') {
        // Look for standby price in contract
        const standbyItem = contract?.priceList?.find(p => 
          p.planName.toLowerCase().includes('standby') || 
          p.planName.toLowerCase().includes('pausa')
        );
        
        if (standbyItem) {
          serviceFee = standbyItem.price;
          billingNote = `Standby (Contrato: ${standbyItem.planName})`;
        } else {
          serviceFee = 15; // Default 15 USD
          billingNote = 'Standby (Default 15 USD)';
        }
        billingType = 'standby';
      }

      return {
        id: service.id,
        nickname: service.serviceNickname,
        lineNumber: service.serviceLineNumber,
        plan: service.servicePlan,
        currency: service.currency || 'USD',
        serviceFee,
        equipmentFee,
        total: serviceFee + equipmentFee,
        billingNote,
        billingType,
        status: service.status
      };
    }).filter(item => item.billingType !== 'none'); // Don't show fully canceled items from past months
  }, [services, equipment, contracts, pos]);

  const totals = useMemo(() => {
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
        [t('PreBilling.serviceHeader')]: item.nickname,
        [t('PreBilling.lineHeader')]: item.lineNumber,
        [t('PreBilling.planHeader')]: item.plan,
        'Estado': item.status,
        [t('PreBilling.serviceFeeHeader')]: item.serviceFee,
        [t('PreBilling.equipmentFeeHeader')]: item.equipmentFee,
        [t('PreBilling.totalHeader')]: item.total,
        'Currency': item.currency,
        'Observaciones': item.billingNote
      }));

      // Add totals row
      data.push({
        [t('PreBilling.serviceHeader')]: 'TOTALES',
        [t('PreBilling.lineHeader')]: '',
        [t('PreBilling.planHeader')]: '',
        'Estado': '',
        [t('PreBilling.serviceFeeHeader')]: totals.services,
        [t('PreBilling.equipmentFeeHeader')]: totals.equipment,
        [t('PreBilling.totalHeader')]: totals.grandTotal,
        'Currency': billingData[0]?.currency || 'USD',
        'Observaciones': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pre-billing");
      XLSX.writeFile(workbook, `PreBilling_${client.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{t('PreBilling.title')}</DialogTitle>
              <DialogDescription>
                {client.name} - Periodo: {format(new Date(), 'MMMM yyyy')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold">{t('PreBilling.serviceHeader')}</TableHead>
                  <TableHead className="font-bold">{t('PreBilling.planHeader')}</TableHead>
                  <TableHead className="font-bold text-center">Estado</TableHead>
                  <TableHead className="text-right font-bold">{t('PreBilling.serviceFeeHeader')}</TableHead>
                  <TableHead className="text-right font-bold">{t('PreBilling.equipmentFeeHeader')}</TableHead>
                  <TableHead className="text-right font-bold">{t('PreBilling.totalHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-bold text-slate-700">{item.nickname}</div>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.lineNumber}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.plan}
                      {item.billingNote && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 font-bold uppercase">
                          <Info className="h-3 w-3" />
                          {item.billingNote}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-bold",
                        item.status === 'active' ? "bg-green-50 text-green-700 border-green-200" :
                        item.status === 'paused' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {t(`Status.${item.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-xs">{item.serviceFee.toLocaleString()} {item.currency}</span>
                        {item.billingType === 'pro-rata' && <Badge className="text-[8px] h-3 px-1 bg-blue-100 text-blue-700 border-none">Pro-rata</Badge>}
                        {item.billingType === 'standby' && <Badge className="text-[8px] h-3 px-1 bg-amber-100 text-amber-700 border-none">Standby</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {item.equipmentFee > 0 ? (
                        <span className="text-blue-600">{item.equipmentFee.toLocaleString()} {item.currency}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {item.total.toLocaleString()} {item.currency}
                    </TableCell>
                  </TableRow>
                ))}
                {billingData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center italic text-muted-foreground">
                      No hay servicios activos o facturables para este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-slate-50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                {t('PreBilling.totalServices')}
              </span>
              <p className="text-xl font-bold">
                {totals.services.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                {t('PreBilling.totalEquipment')}
              </span>
              <p className="text-xl font-bold text-blue-700">
                {totals.equipment.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                {t('PreBilling.grandTotal')}
              </span>
              <p className="text-xl font-bold text-primary">
                {totals.grandTotal.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{billingData[0]?.currency || 'USD'}</span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {t('Auth.cancelLabel')}
          </Button>
          <Button onClick={handleExport} disabled={billingData.length === 0 || isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('PreBilling.exportExcel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
