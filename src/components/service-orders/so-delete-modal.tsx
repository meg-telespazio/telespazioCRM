'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/firebase/client-provider';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import type { ServiceOrder } from '@/lib/types';

interface SODeleteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  so: ServiceOrder | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function SODeleteModal({
  isOpen,
  onOpenChange,
  so,
  onConfirm,
  isDeleting,
}: SODeleteModalProps) {
  const { t } = useI18n();
  const [confirmationText, setConfirmationText] = useState('');

  const canConfirm = confirmationText.trim().toLowerCase() === 'borrar';

  const handleClose = () => {
    setConfirmationText('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            ¿Eliminar Service Order?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Esta acción es <strong>irreversible</strong>. Se eliminará la orden <span className="font-mono font-bold text-foreground">{so?.publicId}</span>, junto con todos sus ítems y comentarios asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <Label className="text-xs font-bold uppercase text-muted-foreground text-center block">
            Escriba "Borrar" para confirmar
          </Label>
          <Input
            placeholder="Escriba aquí..."
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="text-center font-bold"
            autoFocus
          />
        </div>

        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={handleClose} disabled={isDeleting}>
              {t('Auth.cancelLabel')}
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!canConfirm || isDeleting}
            className="min-w-[120px]"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Eliminar Todo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
