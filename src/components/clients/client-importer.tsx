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
import type { Client } from '@/lib/types';
import { z } from 'zod';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type ImporterStep = 'upload' | 'map' | 'preview' | 'import';
type ClientField = keyof Omit<
  Client,
  'id' | 'publicId' | 'createdAt' | 'createdBy'
>;

const REQUIRED_FIELDS: ClientField[] = [
  'name',
  'cuit',
  'email',
  'phone',
  'status',
  'industry',
];
const OPTIONAL_FIELDS: ClientField[] = ['website', 'notes'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

type ValidatedRow = {
  data: Partial<Client>;
  status: 'valid' | 'invalid';
  errors: string[];
  originalIndex: number;
};

type ClientImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  clients: Client[];
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('Validation.nameMin')),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email(),
    phone: z.string().min(1, t('Validation.phoneMin')),
    cuit: z
      .string()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 11, {
        message: t('Validation.cuitInvalid'),
      }),
    status: z.enum(['active', 'suspended', 'canceled']),
    industry: z.string().min(1, t('Validation.selectIndustry')),
    notes: z.string().optional(),
  });

export function ClientImporter({
  isOpen,
  onOpenChange,
  clients,
}: ClientImporterProps) {
  const { t } = useI18n();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);

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
    }
  };

  const getFieldLabel = (field: ClientField) => {
    const key = `Forms.${
      field === 'name'
        ? 'clientName'
        : field === 'email'
        ? 'clientEmail'
        : field === 'phone'
        ? 'clientPhone'
        : field
    }`;
    return t(key);
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

    // Using setTimeout to allow UI to update to show "processing" state
    setTimeout(() => {
      const seenInFile: { cuit: Record<string, number>; name: Record<string, number> } = { cuit: {}, name: {} };
      const existingCuits = new Set(clients.map((c) => c.cuit));
      const existingNames = new Set(clients.map((c) => c.name.toLowerCase()));

      const results: ValidatedRow[] = csvData.map((rawRow, index) => {
        const rowResult: ValidatedRow = {
          data: {},
          status: 'valid',
          errors: [],
          originalIndex: index + 2, // +2 because of header row and 0-based index
        };

        const clientObject: any = {};
        for (const field of ALL_FIELDS) {
          const csvHeader = mapping[field];
          if (
            csvHeader &&
            csvHeader !== 'unmapped' &&
            rawRow[csvHeader] !== undefined
          ) {
            clientObject[field] = rawRow[csvHeader];
          }
        }
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
          // It's safe to use parsed.data now
          const { cuit: cleanCuit, name: cleanName } = parsed.data;

          // Check duplicates in file (only if not the placeholder cuit)
          if (cleanCuit && cleanCuit !== '00000000000') {
            if (seenInFile.cuit[cleanCuit]) {
              rowResult.status = 'invalid';
              rowResult.errors.push(
                t('Importer.error.duplicateInFile', {
                  field: 'CUIT',
                  row: seenInFile.cuit[cleanCuit],
                })
              );
            } else {
              seenInFile.cuit[cleanCuit] = rowResult.originalIndex;
            }
          }
          if (cleanName) {
            const lowerCaseName = cleanName.toLowerCase();
             if (seenInFile.name[lowerCaseName]) {
              rowResult.status = 'invalid';
              rowResult.errors.push(
                t('Importer.error.duplicateInFile', {
                  field: t('Forms.clientName'),
                  row: seenInFile.name[lowerCaseName],
                })
              );
            } else {
              seenInFile.name[lowerCaseName] = rowResult.originalIndex;
            }
          }


          // Check duplicates in DB
          if (cleanCuit && cleanCuit !== '00000000000' && existingCuits.has(cleanCuit)) {
            rowResult.status = 'invalid';
            rowResult.errors.push(t('Importer.error.duplicateInDB', { field: 'CUIT' }));
          }
           if (cleanName && existingNames.has(cleanName.toLowerCase())) {
            rowResult.status = 'invalid';
            rowResult.errors.push(t('Importer.error.duplicateInDB', { field: t('Forms.clientName') }));
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
                accept=".csv"
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
                      <TableHead>{t('Forms.clientName')}</TableHead>
                      <TableHead>{t('Forms.cuit')}</TableHead>
                      <TableHead>{t('Forms.clientEmail')}</TableHead>
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
                        <TableCell>{row.data.cuit || '-'}</TableCell>
                        <TableCell>{row.data.email || '-'}</TableCell>
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
        return t('Importer.clientTitle');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Importer.clientTitle')}</DialogTitle>
          <DialogDescription>{getStepTitle()}</DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="pt-4">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
