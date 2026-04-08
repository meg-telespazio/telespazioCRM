
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/firebase/client-provider';
import { useUser, useFirestore } from '@/firebase';
import { closeServiceOrder } from '@/lib/firestore/service-orders';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { ServiceOrder } from '@/lib/types';

interface SOCloseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  so: ServiceOrder | null;
}

export function SOCloseModal({ isOpen, onOpenChange, so }: SOCloseModalProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [comments, setComments] = useState('');
  const [closeDate, setCloseDate] = useState<Date>(new Date());
  const [isClosing, setIsClosing] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);

  const handleCloseOrder = async () => {
    if (!user || !so) return;
    setIsClosing(true);
    try {
      await closeServiceOrder(firestore, so.id, user as any, { comments, date: closeDate });
      toast({ variant: 'success', title: t('SO.closeSuccess') });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t('SO.closeDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('SO.closeDialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('SO.closeComments')}</Label>
            <Textarea 
              placeholder="..." 
              value={comments} 
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('SO.closeDate')}</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !closeDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closeDate ? format(closeDate, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closeDate}
                  onSelect={(date) => {
                    if (date) setCloseDate(date);
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClosing}>
            {t('Auth.cancelLabel')}
          </Button>
          <Button onClick={handleCloseOrder} disabled={isClosing || !comments.trim()} className="bg-green-600 hover:bg-green-700">
            {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {t('SO.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
