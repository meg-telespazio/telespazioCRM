'use client';

import { useState, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useI18n } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Paperclip, Trash2, FileText, UploadCloud } from 'lucide-react';
import type { OpportunityAttachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AttachmentsManagerProps {
  opportunityId: string;
  disabled: boolean;
}

type Upload = {
  file: File;
  progress: number;
  error?: string;
};

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];
const MAX_FILE_SIZE_MB = 10;
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

  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || disabled) return;

    Array.from(files).forEach((file) => {
      const uniqueFileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploads((prev) => ({ ...prev, [uniqueFileName]: { file, progress: 0, error: `File is too large (max ${MAX_FILE_SIZE_MB}MB).` } }));
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setUploads((prev) => ({ ...prev, [uniqueFileName]: { file, progress: 0, error: 'Invalid file type.' } }));
        return;
      }

      setUploads((prev) => ({ ...prev, [uniqueFileName]: { file, progress: 0 } }));
      
      const filePath = `opportunities/${opportunityId}/${uniqueFileName}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploads((prev) => ({ ...prev, [uniqueFileName]: { ...prev[uniqueFileName], progress } }));
        },
        (error) => {
          console.error('Upload failed:', error);
          setUploads((prev) => ({ ...prev, [uniqueFileName]: { ...prev[uniqueFileName], error: 'Upload failed.' } }));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            append({
              name: file.name,
              url: downloadURL,
              type: file.type,
              size: file.size,
              path: filePath,
            });
            setTimeout(() => {
                setUploads(prev => {
                    const newUploads = {...prev};
                    delete newUploads[uniqueFileName];
                    return newUploads;
                });
            }, 2000);
          } catch(e) {
             setUploads((prev) => ({ ...prev, [uniqueFileName]: { ...prev[uniqueFileName], error: 'Could not get download URL.' } }));
          }
        }
      );
    });
  }, [storage, opportunityId, append, disabled]);

  const handleDelete = async (index: number, attachment: OpportunityAttachment) => {
    if (disabled || !window.confirm(t('Actions.confirmDelete'))) return;
    const fileRef = ref(storage, attachment.path);

    try {
      await deleteObject(fileRef);
      remove(index);
      toast({ variant: 'success', title: 'File deleted successfully' });
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        remove(index);
        toast({ variant: 'default', title: 'File reference removed' });
      } else {
        toast({ variant: 'destructive', title: 'Error deleting file', description: error.message });
      }
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }; // Necessary for drop to work
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
        <CardTitle>Proposal Attachments</CardTitle>
        <CardDescription>Attach relevant files like PDFs, Word documents, or spreadsheets.</CardDescription>
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
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX (max {MAX_FILE_SIZE_MB}MB)</p>
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
                <p className="text-sm text-muted-foreground text-center">Attachment uploads are disabled for this opportunity stage.</p>
            </div>
        )}
        
        <div className="space-y-4">
            {Object.keys(uploads).length > 0 && (
                 <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uploading...</h4>
                    {Object.entries(uploads).map(([uniqueName, upload]) => (
                        <div key={uniqueName} className="p-2 border rounded-md">
                            <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 shrink-0 text-muted-foreground"/>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                                    <Progress value={upload.progress} className="h-2" />
                                    {upload.error && <p className="text-xs text-destructive">{upload.error}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="space-y-2">
                <h4 className="text-sm font-medium">Attached Files</h4>
                {(fields as OpportunityAttachment[]).length > 0 ? (
                  (fields as OpportunityAttachment[]).map((attachment, index) => (
                    <div key={attachment.path} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50">
                        <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                        <div className="flex-1 truncate">
                        <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                            {attachment.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
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
                ) : (
                  <div className="flex flex-col items-center justify-center pt-8 text-center text-sm text-muted-foreground">
                      <Paperclip className="h-8 w-8 mb-2" />
                      <p>No files attached yet.</p>
                  </div>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}