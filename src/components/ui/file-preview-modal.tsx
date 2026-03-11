'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, X, AlertTriangle } from 'lucide-react';
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
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-background rounded-lg">
        {/* Barra superior personalizada para evitar colisión con el botón X de ShadCN */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-1.5 bg-primary/10 rounded text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {file.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2 pr-8"> {/* Padding derecho para no tapar el botón X nativo */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
              asChild
            >
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Abrir en pestaña</span>
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
              asChild
            >
              <a href={file.url} download={file.name}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Área de contenido */}
        <div className="flex-1 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-2 sm:p-6 overflow-hidden relative">
          {isImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded shadow-sm"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col gap-2">
              <iframe
                src={`${file.url}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded border bg-white"
                title={file.name}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-[10px] px-3 py-1 rounded-full border border-amber-200 shadow-md font-bold flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Si el documento no carga, usa el botón "Abrir en pestaña" arriba.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl">
                <FileText className="h-20 w-20 text-muted-foreground/40" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">Sin vista previa disponible</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Este formato no puede previsualizarse en el navegador. Por favor descarga el archivo.
                </p>
              </div>
              <Button asChild className="gap-2">
                <a href={file.url} download={file.name}>
                  <Download className="h-4 w-4" />
                  Descargar archivo
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
