
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { useI18n } from '@/firebase/client-provider';

interface FilePreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    url: string;
    name: string;
    type: string;
  } | null;
}

export function FilePreviewModal({
  isOpen,
  onOpenChange,
  file,
}: FilePreviewModalProps) {
  const { t } = useI18n();

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary/10 rounded text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <DialogTitle className="text-sm font-bold truncate pr-8">
              {file.name}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              asChild
            >
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{t('Actions.openExternal')}</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              asChild
            >
              <a href={file.url} download={file.name}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 overflow-hidden relative">
          {isImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform hover:scale-[1.02] duration-300"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${file.url}#toolbar=0`}
              className="w-full h-full rounded border shadow-sm bg-white"
              title={file.name}
            />
          ) : (
            <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl">
                <FileText className="h-20 w-20 text-muted-foreground/40" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  {t('Proposal.noPreview')}
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Este formato de archivo no puede previsualizarse directamente.
                </p>
              </div>
              <Button asChild className="gap-2 shadow-lg">
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t('Actions.openExternal')}
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
