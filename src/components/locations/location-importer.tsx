
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
import type { Location, LocationType, LocationStatus } from '@/lib/types';
import { z } from 'zod';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type ImporterStep = 'upload' | 'map' | 'preview' | 'import';
type LocationField = keyof Omit<
  Location,
  'id' | 'publicId' | 'createdAt' | 'createdBy' | 'clientId'
>;

const locationTypes: LocationType[] = ['branch', 'headquarters', 'warehouse', 'office', 'property', 'field'];
const statusOptions: LocationStatus[] = ['active', 'suspended'];

const REQUIRED_FIELDS: LocationField[] = [
  'name',
  'type',
  'status',
  'streetName',
  'streetNumber',
  'city',
  'province',
  'country',
  'postalCode',
  'latitude',
  'longitude',
];
const OPTIONAL_FIELDS: LocationField[] = ['notes'];
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
  clientId: string;
  locations: Location[];
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('Validation.nameMin')),
    type: z.enum(locationTypes, { required_error: t('Validation.fieldRequired') }),
    status: z.enum(statusOptions, { required_error: t('Validation.fieldRequired') }),
    streetName: z.string().min(1, t('Validation.fieldRequired')),
    streetNumber: z.string().min(1, t('Validation.fieldRequired')),
    city: z.string().min(1, t('Validation.fieldRequired')),
    province: z.string().min(1, t('Validation.fieldRequired')),
    country: z.string().min(1, t('Validation.fieldRequired')),
    postalCode: z.string().min(1, t('Validation.fieldRequired')),
    latitude: z.coerce.number({ invalid_type_error: t('Validation.isNumber') }),
    longitude: z.coerce.number({ invalid_type_error: t('Validation.isNumber') }),
    notes: z.string().optional(),
  });

export function LocationImporter({
  isOpen,
  onOpenChange,
  clientId,
  locations,
}: LocationImporterProps) {
  const { t } = useI18n();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const [step, setStep] = useState<ImporterStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<LocationField, string>>(
    {} as any
  );
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setError(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({} as any);
    setValidatedData([]);
    setIsProcessing(false);
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
    const keyMap: Record<LocationField, string> = {
      name: 'Locations.name',
      type: 'Locations.type',
      status: 'Locations.status',
      streetName: 'Locations.streetName',
      streetNumber: 'Locations.streetNumber',
      city: 'Locations.city',
      province: 'Locations.province',
      country: 'Locations.country',
      postalCode: 'Locations.postalCode',
      latitude: 'Locations.latitude',
      longitude: 'Locations.longitude',
      notes: 'Locations.notes',
    };
    return t(keyMap[field] || field);
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
      const seenInFile = new Map<string, number>();
      const existingNames = new Set(locations.map((loc) => loc.name.toLowerCase()));

      const results: ValidatedRow[] = csvData.map((rawRow, index) => {
        const rowResult: ValidatedRow = {
          data: {},
          status: 'valid',
          errors: [],
          originalIndex: index + 2,
        };

        const locationObject: any = { clientId };
        for (const field of ALL_FIELDS) {
          const csvHeader = mapping[field as keyof typeof mapping];
          if (csvHeader && csvHeader !== 'unmapped' && rawRow[csvHeader] !== undefined) {
            locationObject[field] = rawRow[csvHeader];
          }
        }
        rowResult.data = locationObject;

        const parsed = formSchema.safeParse(locationObject);

        if (!parsed.success) {
          rowResult.status = 'invalid';
          parsed.error.errors.forEach((err) => {
            rowResult.errors.push(
              t('Importer.error.invalidField', {
                field: getFieldLabel(err.path[0] as LocationField),
                message: err.message,
              })
            );
          });
        } else {
          const { name: cleanName } = parsed.data;
          
          if (cleanName) {
            const lowerCaseName = cleanName.toLowerCase();
            if (seenInFile.has(lowerCaseName)) {
              rowResult.status = 'invalid';
              rowResult.errors.push(
                t('Importer.error.duplicateInFile', {
                  field: getFieldLabel('name'),
                  row: seenInFile.get(lowerCaseName),
                })
              );
            } else {
              seenInFile.set(lowerCaseName, rowResult.originalIndex);
            }

            if (existingNames.has(lowerCaseName)) {
              rowResult.status = 'invalid';
              rowResult.errors.push(t('Importer.error.duplicateInDB', { field: getFieldLabel('name') }));
            }
          }
        }

        return rowResult;
      });

      setValidatedData(results);
      setIsProcessing(false);
      setStep('preview');
    }, 100);
  };
  
  const validRowCount = useMemo(() => validatedData.filter(r => r.status === 'valid').length, [validatedData]);
  const invalidRowCount = useMemo(() => validatedData.filter(r => r.status === 'invalid').length, [validatedData]);

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">{t('Importer.importingTitle')}</h3>
          <p className="text-muted-foreground">{t('Importer.importingDescription')}</p>
        </div>
      );
    }
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
                  <AlertTitle>{t('Auth.registerFailedTitle')}</AlertTitle>
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
                <AlertTitle>{t('Auth.registerFailedTitle')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );
      case 'preview':
        return (
          <div className='space-y-4'>
            <Card>
                <CardHeader>
                    <CardTitle>{t('Importer.validationSummary')}</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                    <p className='text-green-600'>{t('Importer.readyForImport', {count: validRowCount})}</p>
                    <p className='text-destructive'>{t('Importer.recordsWithErrors', {count: invalidRowCount})}</p>
                </CardContent>
            </Card>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead>{t('Importer.previewTable.status')}</TableHead>
                      <TableHead>{t('Locations.name')}</TableHead>
                      <TableHead>{t('Locations.streetName')}</TableHead>
                      <TableHead>{t('Locations.city')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge variant='default' className='bg-green-600'>{t('Importer.importStatus.valid')}</Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive">{t('Importer.importStatus.invalid')}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="list-disc pl-4">
                                  {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{row.data.name || '-'}</TableCell>
                        <TableCell>{row.data.streetName || '-'}</TableCell>
                        <TableCell>{row.data.city || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        );
      default:
        return <p>WIP</p>;
    }
  };

  const renderFooter = () => {
    if (step === 'map') {
      return (
        <div className="flex w-full justify-between">
          <Button variant="outline" onClick={() => resetState() && setStep('upload')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('Importer.backButton')}
          </Button>
          <Button onClick={handleValidateData}>
            {t('Importer.nextButton')}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }
     if (step === 'preview') {
      return (
        <div className="flex w-full justify-between">
          <Button variant="outline" onClick={() => setStep('map')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('Importer.backButton')}
          </Button>
          <Button onClick={() => {}} disabled={validRowCount === 0}>
            {t('Importer.importButton')}
          </Button>
        </div>
      );
    }
    return null;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'upload':
        return t('Importer.step1Title');
      case 'map':
        return t('Importer.step2Title');
      case 'preview':
        return t('Importer.step3Title');
      case 'import':
        return t('Importer.step4Title');
      default:
        return t('Importer.locationTitle');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Importer.locationTitle')}</DialogTitle>
          <DialogDescription>{getStepTitle()}</DialogDescription>
        </DialogHeader>
        {renderContent()}
        <DialogFooter className="pt-4">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
