'use client';

import { useState } from 'react';
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
import { FileUp, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
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

type ClientImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ClientImporter({ isOpen, onOpenChange }: ClientImporterProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<ImporterStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<ClientField, string>>(
    {} as any
  );

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setError(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({} as any);
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
          <div>
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
                              setMapping((prev) => ({ ...prev, [field]: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('Importer.unmapped')} />
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
          </div>
        );
      // ... other steps later
      default:
        return <p>WIP</p>;
    }
  };

  const renderFooter = () => {
    if (step === 'map') {
      return (
        <div className="flex w-full justify-between">
          <Button variant="outline" onClick={() => setStep('upload')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('Importer.backButton')}
          </Button>
          <Button onClick={() => {/* TODO: Go to preview step */}}>
            {t('Importer.nextButton')}
            <ChevronRight className="ml-2 h-4 w-4" />
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
      <DialogContent className="sm:max-w-2xl">
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
