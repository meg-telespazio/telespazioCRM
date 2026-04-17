
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
  Building2,
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
import type { Location, Client, LocationType, LocationStatus } from '@/lib/types';
import { z } from 'zod';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useFirestore, useUser } from '@/firebase';
import { addLocation } from '@/lib/firestore/locations';
import { Label } from '../ui/label';

type ImporterStep = 'client-selection' | 'upload' | 'map' | 'preview' | 'importing';

type LocationField = keyof Omit<
  Location,
  'id' | 'publicId' | 'clientId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'management' | 'assignedTo'
>;

const REQUIRED_FIELDS: LocationField[] = [
  'name',
  'type',
  'status',
];

const OPTIONAL_FIELDS: LocationField[] = [
  'streetName',
  'streetNumber',
  'city',
  'province',
  'country',
  'postalCode',
  'latitude',
  'longitude',
  'notes',
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

type ValidatedRow = {
  data: Partial<Location>;
  status: 'valid' | 'invalid';
  errors: string[];
  originalIndex: number;
};

type LocationImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allClients: Client[];
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('Validation.nameMin')),
    type: z.enum(['branch', 'headquarters', 'warehouse', 'office', 'property', 'field']),
    status: z.enum(['active', 'suspended']),
    streetName: z.string().optional(),
    streetNumber: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    latitude: z.coerce.number().optional().or(z.literal(0)),
    longitude: z.coerce.number().optional().or(z.literal(0)),
    notes: z.string().optional(),
  });

export function LocationImporter({
  isOpen,
  onOpenChange,
  allClients,
}: LocationImporterProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const [step, setStep] = useState<ImporterStep>('client-selection');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<LocationField, string>>(
    {} as any
  );
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const resetState = () => {
    setStep('client-selection');
    setSelectedClientId('');
    setFile(null);
    setError(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({} as any);
    setValidatedData([]);
    setIsProcessing(false);
    setImportProgress(0);
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

  const getFieldLabel = (field: LocationField) => {
    switch(field) {
        case 'name': return 'Nombre de Locación';
        case 'type': return 'Tipo';
        case 'status': return 'Estado';
        case 'streetName': return 'Calle';
        case 'streetNumber': return 'Altura';
        case 'city': return 'Ciudad';
        case 'province': return 'Provincia/Estado';
        case 'country': return 'País';
        case 'postalCode': return 'Código Postal';
        case 'latitude': return 'Latitud';
        case 'longitude': return 'Longitud';
        case 'notes': return 'Notas';
        default: return field;
    }
  };

  const handleValidateData = () => {
    const missingMappings = REQUIRED_FIELDS.filter(
      (field) => !mapping[field] || mapping[field] === 'unmapped'
    );
    if (missingMappings.length > 0) {
      setError(
        `Faltan mapear campos obligatorios: ${missingMappings.map(getFieldLabel).join(', ')}`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    setTimeout(() => {
      const results: ValidatedRow[] = csvData.map((rawRow, index) => {
        const rowResult: ValidatedRow = {
          data: {},
          status: 'valid',
          errors: [],
          originalIndex: index + 2,
        };

        const locationObject: any = {};
        for (const field of ALL_FIELDS) {
          const csvHeader = mapping[field];
          if (
            csvHeader &&
            csvHeader !== 'unmapped' &&
            rawRow[csvHeader] !== undefined
          ) {
            locationObject[field] = rawRow[csvHeader];
          }
        }
        
        // Basic normalization for status and type
        if (locationObject.status) {
            const s = String(locationObject.status).toLowerCase();
            if (s.includes('act')) locationObject.status = 'active';
            else if (s.includes('susp')) locationObject.status = 'suspended';
        }
        if (locationObject.type) {
            const tVal = String(locationObject.type).toLowerCase();
            if (tVal.includes('base') || tVal.includes('branch')) locationObject.type = 'branch';
            else if (tVal.includes('hq') || tVal.includes('central')) locationObject.type = 'headquarters';
        }

        rowResult.data = locationObject;

        const parsed = formSchema.safeParse(locationObject);

        if (!parsed.success) {
          rowResult.status = 'invalid';
          parsed.error.errors.forEach((err) => {
            rowResult.errors.push(
              `${getFieldLabel(err.path[0] as LocationField)}: ${err.message}`
            );
          });
        } 

        return rowResult;
      });

      setValidatedData(results);
      setIsProcessing(false);
      setStep('preview');
    }, 100);
  };

  const handleImport = async () => {
    if (!user || !firestore || !selectedClientId) return;
    
    setIsProcessing(true);
    setStep('importing');
    
    const validRows = validatedData.filter(r => r.status === 'valid');
    let imported = 0;
    
    for (const row of validRows) {
        try {
            await addLocation(firestore, user.uid, {
                ...(row.data as any),
                clientId: selectedClientId,
            });
            imported++;
            setImportProgress(Math.round((imported / validRows.length) * 100));
        } catch (e) {
            console.error("Failed to import row", row, e);
        }
    }
    
    setIsProcessing(false);
    onOpenChange(false);
    resetState();
  };
  
  const validRowCount = useMemo(() => validatedData.filter(r => r.status === 'valid').length, [validatedData]);
  const invalidRowCount = useMemo(() => validatedData.filter(r => r.status === 'invalid').length, [validatedData]);

  const renderContent = () => {
    if (step === 'importing') {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Importando locaciones...</h3>
              <p className="text-muted-foreground">Procesando {importProgress}% ({validRowCount} registros)</p>
            </div>
        );
    }
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Procesando datos...</h3>
        </div>
      );
    }
    switch (step) {
      case 'client-selection':
        return (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-blue-50 p-4">
                    <Building2 className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                   <h3 className="text-lg font-semibold">Seleccionar Cliente</h3>
                   <p className="text-sm text-muted-foreground">Las locaciones importadas se asignarán a este cliente.</p>
                </div>
            </div>
            <div className="max-w-md mx-auto space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {allClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        );
      case 'upload':
        return (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-secondary p-4">
                <FileUp className="h-10 w-10 text-secondary-foreground" />
              </div>
              <p className="text-muted-foreground">
                Seleccione un archivo CSV o Excel (.xlsx) con las locaciones.
              </p>
              <Button asChild>
                <label htmlFor="loc-csv-upload" className="cursor-pointer">
                  Subir Archivo
                </label>
              </Button>
              <input
                id="loc-csv-upload"
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
                    <TableHead>Campo del Sistema</TableHead>
                    <TableHead>Columna del Archivo</TableHead>
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
                              Requerido
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
                                placeholder="No mapeado"
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">
                                No mapeado
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
                <AlertTitle>Error de validación</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );
      case 'preview':
        return (
          <div className='space-y-4'>
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50/50 border-green-100">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium text-green-700">Registros Válidos</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-4 pb-3">
                        <span className="text-2xl font-bold text-green-700">{validRowCount}</span>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-red-100">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium text-red-700">Registros con Error</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-4 pb-3">
                        <span className="text-2xl font-bold text-red-700">{invalidRowCount}</span>
                    </CardContent>
                </Card>
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>País</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge variant='default' className='bg-green-600 font-bold'>OK</Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="font-bold cursor-help">ERROR</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="list-disc pl-4 text-xs">
                                  {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.data.name || '-'}</TableCell>
                        <TableCell className="text-xs">{row.data.city || '-'}</TableCell>
                        <TableCell className="text-xs">{row.data.country || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
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
          <DialogTitle>Importar Locaciones</DialogTitle>
          <DialogDescription>
            Sigue los pasos para importar locaciones masivamente.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="pt-4">
            <div className="flex w-full justify-between items-center">
                {step === 'client-selection' ? (
                     <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                ) : (
                    <Button variant="outline" onClick={() => {
                        if (step === 'upload') setStep('client-selection');
                        else if (step === 'map') setStep('upload');
                        else if (step === 'preview') setStep('map');
                    }}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>
                )}

                {step === 'client-selection' && (
                    <Button onClick={() => setStep('upload')} disabled={!selectedClientId}>
                        Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                
                {step === 'upload' && file && (
                     <Button onClick={() => setStep('map')}>
                        Configurar Mapeo <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                )}

                {step === 'map' && (
                    <Button onClick={handleValidateData}>
                        Validar Datos <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                
                {step === 'preview' && (
                    <Button onClick={handleImport} disabled={validRowCount === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                        {isProcessing ? 'Importando...' : `Importar ${validRowCount} Locaciones`}
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
