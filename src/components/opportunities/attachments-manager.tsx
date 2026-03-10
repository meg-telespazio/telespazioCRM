'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { uploadFile, deleteFile } from '@/lib/storage';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Trash2, FileText, UploadCloud, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
const MAX_FILE_SIZE_MB = 30;
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
  const [errorType, setErrorType] = useState<'CORS' | 'PERMISSION' | null>(null);

  const bucketName = storage.app.options.storageBucket || 'studio-1413684383-379c9.firebasestorage.app';

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || disabled || !opportunityId || opportunityId === 'new') {
      if (opportunityId === 'new') {
        toast({ variant: 'destructive', title: 'Acción requerida', description: 'Guarde la oportunidad antes de subir archivos.' });
      }
      return;
    }

    setErrorType(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Archivo excedido', description: `Máximo ${MAX_FILE_SIZE_MB}MB.` });
        continue;
      }

      const fileId = `${Date.now()}_${file.name}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: 1 }));

      try {
        const path = `opportunities/${opportunityId}/${fileId}`;
        const attachment = await uploadFile(storage, path, file, (progress) => {
          setUploadingFiles(prev => ({ ...prev, [fileId]: Math.max(1, progress) }));
        });

        append(attachment);
        toast({ variant: 'success', title: 'Archivo guardado', description: file.name });
      } catch (error: any) {
        console.error('Opportunity upload error:', error);
        if (error.message === 'CORS_ERROR') {
          setErrorType('CORS');
        } else if (error.message === 'PERMISSION_DENIED') {
          setErrorType('PERMISSION');
        } else {
          toast({ 
            variant: 'destructive', 
            title: 'Error de subida', 
            description: error.message || 'Ocurrió un error inesperado.' 
          });
        }
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
    }
  }, [append, disabled, opportunityId, storage, toast]);

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
        <CardTitle>Documentación de la Oferta</CardTitle>
        <CardDescription>Archivos vinculados a esta oportunidad.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorType === 'CORS' && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold text-red-900">Configuración de Bucket requerida (CORS)</AlertTitle>
            <AlertDescription className="text-xs space-y-4">
              <p>El navegador bloqueó la conexión. Si ya corriste los comandos, por favor <strong>refresca la página (Ctrl+F5)</strong>. Si no, ejecútalos en el Cloud Shell ({'>'}_):</p>
              
              <div className="bg-black text-white p-3 rounded font-mono text-[10px] space-y-2">
                <p className="break-all whitespace-normal">
                  {`echo '[{"origin": ["*"], "method": ["GET", "POST", "PUT", "DELETE", "HEAD"], "responseHeader": ["*"], "maxAgeSeconds": 3600}]' > cors.json`}
                </p>
                <p className="break-all">
                  {`gsutil cors set cors.json gs://${bucketName}`}
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="bg-white w-full">
                <RefreshCw className="mr-2 h-3 w-3" /> Refrescar App (Vital)
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {errorType === 'PERMISSION' && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">Error de Permisos (Firebase Rules)</AlertTitle>
            <AlertDescription className="text-xs">
              El servidor rechazó la subida. He actualizado las reglas de seguridad; por favor intenta subir de nuevo en unos segundos.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {!disabled ? (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors h-full min-h-[200px]",
                isDragging && "border-primary bg-primary/10",
                errorType === 'CORS' && "border-destructive/50"
              )}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <UploadCloud className={cn("w-10 h-10 mb-2", errorType === 'CORS' ? "text-destructive" : "text-muted-foreground")} />
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-semibold text-primary">Subir Archivo</span> o arrastrar aquí
              </p>
              <input
                id="file-upload-opp"
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
                  <p className="text-sm text-muted-foreground text-center">Edición deshabilitada.</p>
              </div>
          )}
          
          <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Lista de Archivos
                <Badge variant="secondary" className="text-[10px]">{fields.length}</Badge>
              </h4>
              
              <div className="space-y-2">
                  {Object.entries(uploadingFiles).map(([id, progress]) => (
                    <div key={id} className="space-y-1 bg-muted/30 p-2 rounded border border-dashed animate-pulse">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="truncate max-w-[150px]">{id.split('_').slice(1).join('_')}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  ))}

                  {fields.length > 0 ? (
                    fields.map((attachment: any, index) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-2 border rounded-md bg-background group hover:border-primary/50 transition-colors">
                          <FileText className="h-6 w-6 shrink-0 text-primary opacity-70" />
                          <div className="flex-1 truncate">
                            <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline">
                                {attachment.name}
                            </Link>
                            <p className="text-[10px] text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(index, attachment)} 
                            disabled={disabled} 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                    ))
                  ) : Object.keys(uploadingFiles).length === 0 && (
                    <div className="text-center py-10 border rounded-lg border-dashed bg-slate-50/50">
                      <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sin documentos</p>
                    </div>
                  )}
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
