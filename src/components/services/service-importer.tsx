'use client';

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/firebase/client-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileUp,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore } from '@/firebase';
import { importServices } from '@/lib/firestore/services';
import type { PurchaseOrder, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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

type ServiceImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pos: PurchaseOrder[];
  defaultPoId?: string;
};

export function ServiceImporter({
  isOpen,
  onOpenChange,
  pos,
  defaultPoId,
}: ServiceImporterProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedPo, setSelectedPo] = useState<string>(defaultPoId || '');
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const resetState = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setSelectedPo(defaultPoId || '');
    setIsImporting(false);
    setImportCount(0);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

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
        },
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const { read, utils } = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = utils.sheet_to_json(ws);
          const headers = utils.sheet_to_json(ws, { header: 1 })[0] as string[];
          setCsvHeaders(headers || []);
          setCsvData(jsonData);
          setStep('map');
        } catch (err) {
          toast({ variant: 'destructive', title: 'Error reading Excel file' });
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const startImport = async () => {
    if (!user || !selectedPo) return;
    setIsImporting(true);

    const servicesToImport = csvData.map((row) => {
      const service: any = {};
      SERVICE_FIELDS.forEach((f) => {
        const mappedHeader = mapping[f.key];
        if (mappedHeader && mappedHeader !== 'unmapped') {
          service[f.key] = row[mappedHeader];
        }
      });
      return service;
    });

    try {
      await importServices(firestore, user.uid, servicesToImport, selectedPo);
      setImportCount(servicesToImport.length);
      toast({
        variant: 'success',
        title: 'Import Successful',
        description: `${servicesToImport.length} services imported correctly.`,
      });
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Services.import')}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && t('Importer.step1Title')}
            {step === 'map' && t('Importer.step2Title')}
            {step === 'preview' && t('Importer.step3Title')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
            <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-6">
              {t('Importer.uploadPrompt')}
            </p>
            <Button asChild>
              <label className="cursor-pointer">
                {t('Importer.uploadButton')}
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept=".csv, .xlsx, .xls"
                />
              </label>
            </Button>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <label className="text-sm font-bold block mb-2">
                {t('Forms.poNumber')}
              </label>
              <Select value={selectedPo} onValueChange={setSelectedPo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione la PO..." />
                </SelectTrigger>
                <SelectContent>
                  {pos.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.id} ({po.contractId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>{t('Importer.appField')}</TableHead>
                    <TableHead>{t('Importer.csvColumn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SERVICE_FIELDS.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="font-medium">
                        {f.label || t(`Forms.${f.key}`)}
                        {f.required && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-primary text-primary"
                          >
                            {t('Importer.required')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[f.key] || 'unmapped'}
                          onValueChange={(v) =>
                            setMapping((p) => ({ ...p, [f.key]: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('Importer.unmapped')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">
                              {t('Importer.unmapped')}
                            </SelectItem>
                            {csvHeaders.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
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
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>{t('Importer.validationSummary')}</AlertTitle>
              <AlertDescription>
                {t('Importer.readyForImport', { count: csvData.length })}
              </AlertDescription>
            </Alert>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Nickname</TableHead>
                    <TableHead>Terminal (UUID)</TableHead>
                    <TableHead>Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {row[mapping['serviceNickname']] || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row[mapping['equipmentId']] || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row[mapping['servicePlan']] || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {csvData.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground italic text-xs">
                        ... and {csvData.length - 5} more records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'map' && (
            <Button
              onClick={() => setStep('preview')}
              disabled={!selectedPo || !mapping['serviceNickname'] || !mapping['equipmentId']}
            >
              {t('Importer.nextButton')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 'preview' && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep('map')}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('Importer.backButton')}
              </Button>
              <Button onClick={startImport} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t('Importer.importButton')}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
