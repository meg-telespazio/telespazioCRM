'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { uploadFile, deleteFile } from '@/lib/storage';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AttachmentsManagerProps {
  opportunityId: string;
  disabled: boolean;
}

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

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || disabled || !opportunityId || opportunityId === 'new') {
      if (opportunityId === 'new') {
        toast({ variant: 'destructive', title: 'Guarde primero', description: 'Debe guardar la oportunidad antes de subir archivos.' });
      }
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Archivo muy grande', description: `Máximo ${MAX_FILE_SIZE_MB}MB.` });
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
        toast({ variant: 'success', title: 'Archivo subido', description: file.name });
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Error de subida', 
          description: error.message === 'storage/unauthorized' 
            ? 'Permiso denegado. Intente cerrar sesión y volver a entrar.' 
            : 'Error de red o permisos.' 
        });
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
    } catch (e) {
      console.error('Delete error:', e);
      remove(index);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentación de la Oferta</CardTitle>
        <CardDescription>Archivos vinculados a esta oportunidad.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={cn(
              "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors min-h-[150px]",
              isDragging && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
          >
            <UploadCloud className="w-10 h-10 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-semibold text-primary">Subir archivo</span> o arrastrar aquí
            </p>
            <input
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={disabled || opportunityId === 'new'}
            />
          </div>
          
          <div className="space-y-3">
            {Object.entries(uploadingFiles).map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="truncate">{id.split('_').slice(1).join('_')}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            ))}

            {fields.map((attachment: any, index) => (
              <div key={attachment.id} className="flex items-center gap-3 p-2 border rounded-md group bg-background">
                <FileText className="h-5 w-5 text-primary/70" />
                <div className="flex-1 truncate">
                  <Link href={attachment.url} target="_blank" className="text-xs font-bold hover:underline">
                    {attachment.name}
                  </Link>
                  <p className="text-[9px] text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(index, attachment)} 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            
            {fields.length === 0 && Object.keys(uploadingFiles).length === 0 && (
              <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-xs uppercase font-bold tracking-widest">
                Sin adjuntos
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
