'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/firebase/client-provider';

type ClientImporterProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function ClientImporter({ isOpen, onOpenChange }: ClientImporterProps) {
  const { t } = useI18n();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Importer.clientTitle')}</DialogTitle>
          <DialogDescription className="pt-4">
            {t('Importer.wip')}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
