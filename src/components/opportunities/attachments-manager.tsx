
'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { uploadFile, deleteFile } from '@/lib/storage';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, UploadCloud, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { OpportunityAttachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AttachmentsManagerProps {
  opportunityId: string;
  disabled: boolean;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function AttachmentsManager({ opportunityId, disabled }: AttachmentsManagerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const storage = useStorage();
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attachments',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || disabled || !opportunityId || opportunityId === 'new') {
      if (opportunityId === 'new') {
        toast({
          variant: 'destructive',
          title: 'Guarde primero',
          description: 'Debe guardar la oportunidad antes de adjuntar archivos.'
        });
      }
      return;
    }

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'Archivo muy grande',
          description: `"${file.name}" excede el límite de ${MAX_FILE_SIZE_MB}MB.`
        });
        continue;
      }
      
      const fileId = `${Date.now()}-${file.name}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: 0 }));

      try {
        const path = `opportunities/${opportunityId}/${fileId}`;
        const attachment = await uploadFile(storage, path, file, (progress) => {
          setUploadingFiles(prev => ({ ...prev, [fileId]: progress }));
        });

        append(attachment);
        toast({ title: 'Archivo subido', description: file.name });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error de subida',
          description: `No se pudo subir "${file.name}".`
        });
      } finally {
        setUploadingFiles(prev => {
          const newState = { ...prev };
          delete newState[fileId];
          return newState;
        });
      }
    }
  }, [append, disabled, opportunityId, storage, toast]);

  const handleDelete = async (index: number, attachment: OpportunityAttachment) => {
    if (disabled || !window.confirm(t('Actions.confirmDelete'))) return;

    try {
      if (attachment.path && !attachment.url.includes('#simulated')) {
        await deleteFile(storage, attachment.path);
      }
      remove(index);
      toast({ title: 'Archivo eliminado' });
    } catch (error) {
      remove(index); // Remove from list anyway if not found in storage
    }
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
        <CardTitle>Archivos Adjuntos de la Propuesta</CardTitle>
        <CardDescription>Organizados en la carpeta: opportunities/{opportunityId}/</CardDescription>
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
              <span className="font-semibold text-primary">Clic para subir</span> o arrastrar
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, Imágenes (max {MAX_FILE_SIZE_MB}MB)</p>
            <input
              id="file-upload"
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept={ALLOWED_FILE_TYPES.join(',')}
              disabled={disabled || opportunityId === 'new'}
            />
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg bg-muted/50 h-full min-h-[200px]">
                <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">La subida de adjuntos está deshabilitada.</p>
            </div>
        )}
        
        <div className="space-y-4">
            <h4 className="text-sm font-medium">Lista de Documentos</h4>
            
            {/* Uploading Status */}
            {Object.entries(uploadingFiles).map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px]">{id.split('-').slice(1).join('-')}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            ))}

            <div className="space-y-2">
                {(fields as OpportunityAttachment[]).length > 0 ? (
                  (fields as OpportunityAttachment[]).map((attachment, index) => (
                    <div key={attachment.path} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50">
                        <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                        <div className="flex-1 truncate">
                          <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                              {attachment.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index, attachment)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  ))
                ) : Object.keys(uploadingFiles).length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-8 text-center text-sm text-muted-foreground">
                      <Paperclip className="h-8 w-8 mb-2 opacity-20" />
                      <p>No hay archivos.</p>
                  </div>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
