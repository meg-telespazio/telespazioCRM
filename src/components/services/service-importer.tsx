
'use client';

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/firebase/client-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileUp, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser, useFirestore } from '@/firebase';
import { importServices } from '@/lib/firestore/services';
import type { PurchaseOrder } from '@/lib/types';

const SERVICE_FIELDS = [
  { key: 'serviceNickname', required: true },
  { key: 'serviceLineNumber', required: true },
  { key: 'partnerName', required: false },
  { key: 'customerName', required: false },
  { key: 'customerAccountNumber', required: false },
  { key: 'servicePlan', required: false },
  { key: 'serviceAllocationGb', required: false },
  { key: 'topUp', required: false },
  { key: 'equipmentId', required: true, label: 'User Terminal ID (UUID)' },
  { key: 'userTerminal', required: false, label: 'Terminal Nickname (KIT...)' }
];

export function ServiceImporter({ isOpen, onOpenChange, pos }: { isOpen: boolean, onOpenChange: (o: boolean) => void, pos: PurchaseOrder[] }) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedPo, setSelectedPo] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => {
          setCsvHeaders(r.meta.fields || []);
          setCsvData(r.data);
          setStep('map');
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const { read, utils } = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = utils.sheet_to_json(ws);
        const headers = utils.sheet_to_json(ws, { header: 1 })[0] as string[];
        setCsvHeaders(headers);
        setCsvData(jsonData);
        setStep('map');
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Services.import')}</DialogTitle>
          <DialogDescription>{t(`Importer.step${step === 'upload' ? '1' : step === 'map' ? '2' : '3'}Title`)}</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
            <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-6">{t('Importer.uploadPrompt')}</p>
            <Button asChild>
              <label className="cursor-pointer">
                {t('Importer.uploadButton')}
                <input type="file" className="sr-only" onChange={handleFileChange} accept=".csv, .xlsx, .xls" />
              </label>
            </Button>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <label className="text-sm font-bold block mb-2">{t('Forms.contract')}</label>
              <Select value={selectedPo} onValueChange={setSelectedPo}>
                <SelectTrigger><SelectValue placeholder="Seleccione la PO..." /></SelectTrigger>
                <SelectContent>{pos.map(po => <SelectItem key={po.id} value={po.id}>{po.id} ({po.contractId})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>{t('Importer.appField')}</TableHead><TableHead>{t('Importer.csvColumn')}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {SERVICE_FIELDS.map(f => (
                    <TableRow key={f.key}>
                      <TableCell className="font-medium">{f.label || t(`Forms.${f.key}`)} {f.required && <Badge variant="outline" className="ml-2 border-primary text-primary">Req</Badge>}</TableCell>
                      <TableCell>
                        <Select value={mapping[f.key]} onValueChange={(v) => setMapping(p => ({...p, [f.key]: v}))}>
                          <SelectTrigger><SelectValue placeholder={t('Importer.unmapped')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">{t('Importer.unmapped')}</SelectItem>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('Importer.readyForImport', { count: csvData.length })}</AlertDescription>
            </Alert>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Nickname</TableHead><TableHead>Terminal</TableHead><TableHead>Plan</TableHead></TableRow></TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row[mapping['serviceNickname']] || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{row[mapping['equipmentId']] || '-'}</TableCell>
                      <TableCell>{row[mapping['servicePlan']] || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'map' && <Button onClick={() => setStep('preview')} disabled={!selectedPo}>{t('Importer.nextButton')}</Button>}
          {step === 'preview' && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep('map')}>{t('Importer.backButton')}</Button>
              <Button onClick={startImport} disabled={isImporting}>{isImporting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}{t('Importer.importButton')}</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
