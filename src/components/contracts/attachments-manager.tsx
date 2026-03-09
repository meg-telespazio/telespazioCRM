
'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { uploadFile, deleteFile } from '@/lib/storage';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AttachmentsManagerProps {
  disabled: boolean;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function AttachmentsManager({ disabled }: AttachmentsManagerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const storage = useStorage();
  const params = useParams();
  const contractId = params.id as string;
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attachments',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || disabled || !contractId || contractId === 'new') {
      if (contractId === 'new') {
        toast({ variant: 'destructive', title: 'Acción requerida', description: 'Guarde el contrato antes de subir archivos.' });
      }
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Archivo excedido', description: `Max ${MAX_FILE_SIZE_MB}MB.` });
        continue;
      }

      const fileId = `${Date.now()}_${file.name}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: 1 }));

      try {
        const path = `contracts/${contractId}/${fileId}`;
        const attachment = await uploadFile(storage, path, file, (progress) => {
          setUploadingFiles(prev => ({ ...prev, [fileId]: Math.max(1, progress) }));
        });

        append(attachment);
        toast({ variant: 'success', title: 'Archivo guardado', description: file.name });
      } catch (error: any) {
        console.error('Upload error in component:', error);
        
        // Error descriptivo para el usuario sobre CORS
        toast({ 
          variant: 'destructive', 
          title: 'Error de conexión (CORS)', 
          description: 'El navegador bloqueó la subida. Asegúrate de haber configurado el CORS en el bucket t-track-bucket desde la consola de Google Cloud (botón >_).' 
        });
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
    }
  }, [append, disabled, contractId, storage, toast]);

  const handleDelete = async (index: number, attachment: any) => {
    if (disabled || !window.confirm(t('Actions.confirmDelete'))) return;
    try {
      if (attachment.path) await deleteFile(storage, attachment.path);
      remove(index);
      toast({ title: 'Adjunto eliminado' });
    } catch (e) {
      console.error('Delete error:', e);
      remove(index);
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (!disabled && e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Contracts.attachments')}</CardTitle>
        <CardDescription>Archivos vinculados al contrato.</CardDescription>
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
              <span className="font-semibold text-primary">Subir Archivo</span>
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX (max {MAX_FILE_SIZE_MB}MB)</p>
            <input
              id="file-upload"
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept={ALLOWED_FILE_TYPES.join(',')}
              disabled={disabled || contractId === 'new'}
            />
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg bg-muted/50 h-full min-h-[200px]">
                <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Edición deshabilitada.</p>
            </div>
        )}
        
        <div className="space-y-4">
            <h4 className="text-sm font-medium">Documentación adjunta</h4>
            
            {Object.entries(uploadingFiles).map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="truncate">{id.split('_').slice(1).join('_')}</span>
                  <div className="flex items-center gap-2">
                    {progress <= 1 && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            ))}

            <div className="space-y-2">
                {fields.length > 0 ? (
                  fields.map((attachment: any, index) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 border rounded-md bg-background group">
                        <FileText className="h-6 w-6 shrink-0 text-primary" />
                        <div className="flex-1 truncate">
                          <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:underline">
                              {attachment.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index, attachment)} disabled={disabled} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  ))
                ) : Object.keys(uploadingFiles).length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8 italic border rounded-lg border-dashed">Sin documentos adjuntos.</p>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
