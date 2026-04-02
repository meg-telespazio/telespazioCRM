
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
import type { Client, Service, Equipment } from '@/lib/types';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

interface PreBillingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  services: Service[];
  equipment: Equipment[];
}

export function PreBillingModal({
  isOpen,
  onOpenChange,
  client,
  services,
  equipment,
}: PreBillingModalProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const billingData = useMemo(() => {
    return services.map(service => {
      const equip = equipment.find(e => e.id === service.equipmentId);
      const equipmentFee = (!equip?.isClientOwned) ? (equip?.comodatoFee || 0) : 0;
      const serviceFee = service.monthlyFee || 0;
      
      return {
        id: service.id,
        nickname: service.serviceNickname,
        lineNumber: service.serviceLineNumber,
        plan: service.servicePlan,
        currency: service.currency || 'USD',
        serviceFee,
        equipmentFee,
        total: serviceFee + equipmentFee
      };
    });
  }, [services, equipment]);

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
        [t('PreBilling.serviceFeeHeader')]: item.serviceFee,
        [t('PreBilling.equipmentFeeHeader')]: item.equipmentFee,
        [t('PreBilling.totalHeader')]: item.total,
        'Currency': item.currency
      }));

      // Add totals row
      data.push({
        [t('PreBilling.serviceHeader')]: 'TOTALES',
        [t('PreBilling.lineHeader')]: '',
        [t('PreBilling.planHeader')]: '',
        [t('PreBilling.serviceFeeHeader')]: totals.services,
        [t('PreBilling.equipmentFeeHeader')]: totals.equipment,
        [t('PreBilling.totalHeader')]: totals.grandTotal,
        'Currency': billingData[0]?.currency || 'USD'
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{t('PreBilling.title')}</DialogTitle>
              <DialogDescription>
                {client.name} - {client.publicId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold">{t('PreBilling.serviceHeader')}</TableHead>
                  <TableHead className="font-bold">{t('PreBilling.planHeader')}</TableHead>
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
                    <TableCell className="text-xs">{item.plan}</TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {item.serviceFee.toLocaleString()} {item.currency}
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
                    <TableCell colSpan={5} className="h-24 text-center italic text-muted-foreground">
                      No hay servicios activos para facturar.
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
