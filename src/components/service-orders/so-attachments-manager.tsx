'use client';

import { useState, useCallback } from 'react';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { useStorage, useUser, useFirestore } from '@/firebase';
import { uploadFile, deleteFile } from '@/lib/storage';
import { updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Trash2, FileText, UploadCloud, Eye, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import type { OpportunityAttachment } from '@/lib/types';

interface SOAttachmentsManagerProps {
  soId: string;
  attachments?: OpportunityAttachment[];
  disabled: boolean;
}

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function SOAttachmentsManager({ soId, attachments = [], disabled }: SOAttachmentsManagerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const storage = useStorage();
  const firestore = useFirestore();
  const { user } = useUser();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || disabled || !soId || !user) return;

    // Lógica para carpetas temporales seguras (temp-{uid})
    const folderId = (soId === 'new' || !soId) ? `temp-${user.uid}` : soId;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Archivo muy grande', description: `Máximo ${MAX_FILE_SIZE_MB}MB.` });
        continue;
      }

      const fileId = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: 1 }));

      try {
        const path = `service_orders/${folderId}/${fileId}`;
        const attachment = await uploadFile(storage, path, file, (progress) => {
          setUploadingFiles(prev => ({ ...prev, [fileId]: Math.max(1, progress) }));
        });

        // Update Firestore directly since this is an independent manager
        if (soId !== 'new') {
          const soRef = doc(firestore, 'service_orders', soId);
          await updateDoc(soRef, {
            attachments: arrayUnion(attachment)
          });
        }

        toast({ variant: 'success', title: 'Archivo cargado', description: file.name });
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Error de subida', 
          description: error.message === 'PERMISSION_DENIED' 
            ? 'Permiso denegado por el servidor.' 
            : 'Error al intentar guardar el archivo.' 
        });
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }
    }
  }, [disabled, soId, storage, firestore, toast, user]);

  const handleDelete = async (attachment: OpportunityAttachment) => {
    if (disabled || !window.confirm(t('Actions.confirmDelete'))) return;
    try {
      if (attachment.path) await deleteFile(storage, attachment.path);
      const soRef = doc(firestore, 'service_orders', soId);
      await updateDoc(soRef, {
        attachments: arrayRemove(attachment)
      });
      toast({ variant: 'default', title: 'Archivo eliminado' });
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handlePreview = (attachment: any) => {
    setPreviewFile({
      url: attachment.url,
      name: attachment.name,
      type: attachment.type || (attachment.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    });
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            {t('SO.attachments')}
          </CardTitle>
          <CardDescription>Documentación técnica o comercial de la Service Order. Soporte para .msg, .pdf e imágenes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={cn(
                "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors min-h-[150px]",
                isDragging && "border-primary bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
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
                accept=".msg,.pdf,image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-3">
              {Object.entries(uploadingFiles).map(([id, progress]) => (
                <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate pr-4">{id.split('_').slice(1).join('_')}</span>
                    <span className="font-bold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              ))}

              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border rounded-md group bg-background hover:border-primary/50 transition-colors animate-in fade-in">
                  <FileText className="h-5 w-5 text-primary/70 shrink-0" />
                  <div className="flex-1 truncate">
                    <button 
                      type="button"
                      onClick={() => handlePreview(attachment)}
                      className="text-xs font-bold hover:underline text-left w-full truncate block"
                    >
                      {attachment.name}
                    </button>
                    <p className="text-[9px] text-muted-foreground uppercase">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handlePreview(attachment)}
                      className="h-7 w-7 text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(attachment)} 
                      className="h-7 w-7 text-destructive"
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {attachments.length === 0 && Object.keys(uploadingFiles).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg text-muted-foreground text-[10px] uppercase font-bold tracking-widest bg-muted/10">
                  <Paperclip className="h-4 w-4 mb-1 opacity-30" />
                  Sin archivos cargados
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <FilePreviewModal 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen} 
        file={previewFile} 
      />
    </>
  );
}
