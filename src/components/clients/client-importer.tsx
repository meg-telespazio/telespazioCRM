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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileUp,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import type { Client } from '@/lib/types';
import { z } from 'zod';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useUser, useFirestore } from '@/firebase';
import { addClient } from '@/lib/firestore/clients';

type ImporterStep = 'upload' | 'map' | 'preview' | 'importing' | 'results';

type ClientField = keyof Omit<
  Client,
  'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'createdBy'
>;

const REQUIRED_FIELDS: ClientField[] = [
  'name',
  'legalName',
  'taxIdType',
  'cuit',
];

const OPTIONAL_FIELDS: ClientField[] = [
  'email',
  'phone',
  'website',
  'sector',
  'subsector',
  'holding',
  'countryHQ',
  'costCenterId',
  'notes',
  'status',
  'type'
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

type ValidatedRow = {
  data: Partial<Client>;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
  originalIndex: number;
};

type ImportResults = {
  success: number;
  duplicates: number;
  errors: number;
};

type ClientImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  clients: Client[];
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.coerce.string().min(1, t('Validation.nameMin')),
    legalName: z.coerce.string().min(1, t('Validation.fieldRequired')),
    taxIdType: z.enum(['CUIT', 'RUT_CL', 'RUC_PE', 'CNPJ', 'RUT_CO', 'NIT_CR', 'EIN_US', 'OTHER']),
    cuit: z
      .coerce.string()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length >= 8, {
        message: t('Validation.taxIdInvalid'),
      }),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.coerce.string().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    sector: z.coerce.string().optional().or(z.literal('')),
    subsector: z.coerce.string().optional().or(z.literal('')),
    status: z.enum(['active', 'suspended', 'canceled']).default('active'),
    type: z.enum(['client', 'prospect']).default('client'),
  });

export function ClientImporter({
  isOpen,
  onOpenChange,
  clients,
}: ClientImporterProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const [step, setStep] = useState<ImporterStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<ClientField, string>>(
    {} as any
  );
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<ImportResults>({ success: 0, duplicates: 0, errors: 0 });

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setError(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({} as any);
    setValidatedData([]);
    setIsProcessing(false);
    setImportProgress(0);
    setResults({ success: 0, duplicates: 0, errors: 0 });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);

      const extension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length) {
              setError(t('Importer.fileReadError'));
              return;
            }
            if (!results.meta.fields || results.meta.fields.length === 0) {
              setError(t('Importer.noHeaderError'));
              return;
            }
            setCsvHeaders(results.meta.fields);
            setCsvData(results.data);
            setStep('map');
          },
          error: () => {
            setError(t('Importer.fileReadError'));
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
            if (!headers || headers.length === 0) {
              setError(t('Importer.noHeaderError'));
              return;
            }
            setCsvHeaders(headers);
            setCsvData(jsonData);
            setStep('map');
          } catch (e) {
            setError(t('Importer.fileReadError'));
          }
        };
        reader.readAsBinaryString(selectedFile);
      }
    }
  };

  const getFieldLabel = (field: ClientField) => {
    switch(field) {
      case 'name': return t('Forms.clientName');
      case 'legalName': return t('Forms.legalName');
      case 'taxIdType': return t('Forms.taxIdType');
      case 'cuit': return t('Forms.cuit');
      case 'email': return t('Auth.emailLabel');
      case 'phone': return t('Auth.phoneLabel');
      case 'sector': return t('Forms.sector');
      case 'status': return t('Forms.status');
      default: return field;
    }
  };

  const handleValidateData = () => {
    const missingMappings = REQUIRED_FIELDS.filter(
      (field) => !mapping[field] || mapping[field] === 'unmapped'
    );
    if (missingMappings.length > 0) {
      setError(
        t('Importer.error.missingMapping', {
          fields: missingMappings.map(getFieldLabel).join(', '),
        })
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    setTimeout(() => {
      const seenInFile = new Set<string>();
      const existingCuits = new Set(clients.map((c) => c.cuit));

      const results: ValidatedRow[] = csvData.map((rawRow, index) => {
        const rowResult: ValidatedRow = {
          data: {},
          status: 'valid',
          errors: [],
          originalIndex: index + 2,
        };

        const clientObject: any = {};
        for (const field of ALL_FIELDS) {
          const csvHeader = mapping[field];
          if (csvHeader && csvHeader !== 'unmapped' && rawRow[csvHeader] !== undefined) {
            clientObject[field] = rawRow[csvHeader];
          }
        }

        if (!clientObject.status) clientObject.status = 'active';
        if (!clientObject.type) clientObject.type = 'client';
        if (!clientObject.management) clientObject.management = user?.management || 'Satellite Communications';
        if (!clientObject.assignedTo) clientObject.assignedTo = user?.uid || '';

        rowResult.data = clientObject;

        const parsed = formSchema.safeParse(clientObject);

        if (!parsed.success) {
          rowResult.status = 'invalid';
          parsed.error.errors.forEach((err) => {
            rowResult.errors.push(
              t('Importer.error.invalidField', {
                field: getFieldLabel(err.path[0] as ClientField),
                message: err.message,
              })
            );
          });
        } else {
          const cleanCuit = parsed.data.cuit;

          if (seenInFile.has(cleanCuit)) {
            rowResult.status = 'invalid';
            rowResult.errors.push(t('Importer.error.duplicateInFile', { field: 'ID Tributario', row: 'anterior' }));
          } else {
            seenInFile.add(cleanCuit);
          }

          if (existingCuits.has(cleanCuit)) {
            rowResult.status = 'duplicate';
            rowResult.errors.push(t('Importer.error.duplicateInDB', { field: 'ID Tributario' }));
          }
        }

        return rowResult;
      });

      setValidatedData(results);
      setIsProcessing(false);
      setStep('preview');
    }, 100);
  };

  const handleImport = async () => {
    if (!user || !firestore) return;
    
    setIsProcessing(true);
    setStep('importing');
    
    const rowsToImport = validatedData.filter(r => r.status === 'valid');
    const totalToImport = rowsToImport.length;
    
    let success = 0;
    let errors = 0;
    let duplicates = validatedData.filter(r => r.status === 'duplicate').length;
    
    for (let i = 0; i < totalToImport; i++) {
      const row = rowsToImport[i];
      try {
        const dataToSave = {
          ...row.data,
          assignedTo: user.uid,
          management: user.management || 'Satellite Communications',
        };
        
        await addClient(firestore, user.uid, dataToSave as any);
        success++;
      } catch (e) {
        console.error("Error importing row:", e);
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / totalToImport) * 100));
    }
    
    setResults({ 
      success, 
      duplicates, 
      errors: errors + validatedData.filter(r => r.status === 'invalid').length 
    });
    setStep('results');
    setIsProcessing(false);
  };
  
  const validRowCount = useMemo(() => validatedData.filter(r => r.status === 'valid').length, [validatedData]);

  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-secondary p-4">
                <FileUp className="h-10 w-10 text-secondary-foreground" />
              </div>
              <p className="text-muted-foreground">
                {t('Importer.uploadPrompt')}
              </p>
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {t('Importer.uploadButton')}
                </label>
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv, .xlsx, .xls"
                className="sr-only"
                onChange={handleFileChange}
              />
              {error && (
                <Alert variant="destructive" className="mt-4 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead>{t('Importer.appField')}</TableHead>
                    <TableHead>{t('Importer.csvColumn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_FIELDS.map((field) => {
                    const isRequired = REQUIRED_FIELDS.includes(field);
                    return (
                      <TableRow key={field}>
                        <TableCell className="font-medium">
                          {getFieldLabel(field)}
                          {isRequired && (
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
                            value={mapping[field]}
                            onValueChange={(value) =>
                              setMapping((prev) => ({
                                ...prev,
                                [field]: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t('Importer.unmapped')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">
                                {t('Importer.unmapped')}
                              </SelectItem>
                              {csvHeaders.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {error && (
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Faltan Mapeos</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );
      case 'preview':
        return (
          <div className='space-y-4'>
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-100">
                <CardHeader className="p-3">
                  <CardTitle className="text-xs text-green-700 uppercase">Listos</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span className="text-2xl font-bold text-green-700">{validRowCount}</span>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-100">
                <CardHeader className="p-3">
                  <CardTitle className="text-xs text-amber-700 uppercase">Duplicados</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span className="text-2xl font-bold text-amber-700">{validatedData.filter(r => r.status === 'duplicate').length}</span>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-100">
                <CardHeader className="p-3">
                  <CardTitle className="text-xs text-red-700 uppercase">Con Error</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span className="text-2xl font-bold text-red-700">{validatedData.filter(r => r.status === 'invalid').length}</span>
                </CardContent>
              </Card>
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>{t('Forms.clientName')}</TableHead>
                      <TableHead>{t('Forms.cuit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge variant='default' className='bg-green-600 font-bold'>OK</Badge>
                          ) : row.status === 'duplicate' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 font-bold cursor-help">DUP</Badge>
                              </TooltipTrigger>
                              <TooltipContent><p>{row.errors[0]}</p></TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="font-bold cursor-help">ERR</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="list-disc pl-4 text-xs">
                                  {row.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.data.name || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{row.data.cuit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        );
      case 'importing':
        return (
          <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2 w-full max-w-xs">
              <h3 className="text-lg font-semibold">Importando Clientes...</h3>
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{importProgress}% completado</p>
            </div>
          </div>
        );
      case 'results':
        return (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Importación Finalizada</h3>
              <p className="text-sm text-muted-foreground">Resumen de la operación:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center justify-center gap-2 mb-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Éxito</span>
                </div>
                <span className="text-3xl font-black text-green-700">{results.success}</span>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-center gap-2 mb-1 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Duplicados</span>
                </div>
                <span className="text-3xl font-black text-amber-700">{results.duplicates}</span>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center justify-center gap-2 mb-1 text-red-700">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Fallidos</span>
                </div>
                <span className="text-3xl font-black text-red-700">{results.errors}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Importer.clientTitle')}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Paso 1: Seleccionar archivo CSV o Excel'}
            {step === 'map' && 'Paso 2: Vincular columnas del archivo con campos de Telespazio'}
            {step === 'preview' && 'Paso 3: Validar datos y duplicados'}
            {step === 'importing' && 'Paso 4: Procesando registros...'}
            {step === 'results' && 'Informe Final de Importación'}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="pt-4">
          <div className="flex w-full justify-between items-center">
            {step === 'upload' && <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>}
            
            {step === 'map' && (
              <>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button onClick={handleValidateData}>
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setStep('map')}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validRowCount === 0} 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  Importar {validRowCount} Registros
                </Button>
              </>
            )}

            {step === 'results' && (
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Finalizar y Volver
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
