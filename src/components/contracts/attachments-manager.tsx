'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, UploadCloud } from 'lucide-react';
import type { ContractAttachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AttachmentsManagerProps {
  disabled: boolean;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function AttachmentsManager({ disabled }: AttachmentsManagerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attachments',
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || disabled) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`
        });
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: `File "${file.name}" is not a supported file type.`
        });
        return;
      }
      
      const placeholderAttachment: ContractAttachment = {
        name: file.name,
        url: '#simulated',
        type: file.type,
        size: file.size,
        path: `simulated/${Date.now()}_${file.name}`,
      };

      append(placeholderAttachment);
      
      toast({
        variant: 'default',
        title: 'Archivo añadido (simulado)',
        description: `${file.name} se ha añadido a la lista, pero no se subirá.`,
      });
    });
  }, [append, disabled, t, toast]);

  const handleDelete = async (index: number) => {
    if (disabled || !window.confirm(t('Actions.confirmDelete'))) return;
    remove(index);
    toast({ variant: 'default', title: 'Adjunto eliminado de la lista' });
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Contracts.attachments')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {!disabled ? (
          <div
            className={cn(
              "relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors h-full min-h-[200px]",
              isDragging && "border-primary bg-primary/10"
            )}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <UploadCloud className="w-10 h-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-center text-muted-foreground">
              <span className="font-semibold text-primary">Clic para subir</span> o arrastrar y soltar
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX (max ${MAX_FILE_SIZE_MB}MB)</p>
            <input
              id="file-upload"
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept={ALLOWED_FILE_TYPES.join(',')}
              disabled={disabled}
            />
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg bg-muted/50 h-full min-h-[200px]">
                <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">La subida de adjuntos está deshabilitada.</p>
            </div>
        )}
        
        <div className="space-y-4">
            <div className="space-y-2">
                <h4 className="text-sm font-medium">Archivos Adjuntos</h4>
                {(fields as ContractAttachment[]).length > 0 ? (
                  (fields as ContractAttachment[]).map((attachment, index) => {
                    const isSimulated = attachment.url === '#simulated';
                    return (
                      <div key={attachment.path} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50">
                          <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                          <div className="flex-1 truncate">
                          {isSimulated ? (
                            <span className="text-sm font-medium italic text-muted-foreground" title="Subida simulada">
                                {attachment.name}
                            </span>
                          ) : (
                            <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                                {attachment.name}
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              {isSimulated && <span className="text-amber-600">(No subido)</span>}
                          </p>
                          </div>
                          <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index)}
                          disabled={disabled}
                          >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center pt-8 text-center text-sm text-muted-foreground">
                      <Paperclip className="h-8 w-8 mb-2" />
                      <p>Aún no hay archivos adjuntos.</p>
                  </div>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
