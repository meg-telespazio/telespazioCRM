
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Plus, History, Trash2, Calendar as CalendarIcon, Info } from 'lucide-react';
import type { Addendum, AddendumType } from '@/lib/types';
import { addAddendum, deleteAddendum } from '@/lib/firestore/addendums';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddendumManagerProps {
  contractId: string;
  disabled: boolean;
}

export function AddendumManager({ contractId, disabled }: AddendumManagerProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  
  // New Addendum Form State
  const [newAddendum, setNewAddendum] = useState<{
    date: Date;
    type: AddendumType;
    description: string;
  }>({
    date: new Date(),
    type: 'Extension',
    description: '',
  });

  const addendumsQuery = useMemo(() => {
    if (!contractId) return null;
    return query(
      collection(firestore, 'contracts', contractId, 'addendums'),
      orderBy('date', 'desc')
    );
  }, [firestore, contractId]);

  const { data: addendums, loading } = useCollection<Addendum>(addendumsQuery);

  const handleAdd = async () => {
    if (!user || !contractId || !newAddendum.description) return;
    
    try {
      await addAddendum(firestore, contractId, user.uid, newAddendum);
      toast({ variant: 'success', title: t('Actions.saveSuccess') });
      setIsOpen(false);
      setNewAddendum({ date: new Date(), type: 'Extension', description: '' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Actions.confirmDelete'))) return;
    try {
      await deleteAddendum(firestore, contractId, id);
      toast({ variant: 'default', title: 'Adenda eliminada' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const addendumTypes: AddendumType[] = ['Extension', 'Price Change', 'Clause Modification', 'Service Change', 'Other'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t('Contracts.addendums')}
          </CardTitle>
          <CardDescription>
            Historial de modificaciones y prórrogas firmadas.
          </CardDescription>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('Contracts.addAddendum')}
        </Button>
      </CardHeader>
      <CardContent>
        {addendums && addendums.length > 0 ? (
          <div className="space-y-4">
            {addendums.map((addendum) => (
              <div key={addendum.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded px-3 py-2 shrink-0 min-w-[80px]">
                  <span className="text-[10px] uppercase font-bold">{format(addendum.date, 'MMM', { locale: dateLocale })}</span>
                  <span className="text-xl font-bold">{format(addendum.date, 'dd')}</span>
                  <span className="text-[10px]">{format(addendum.date, 'yyyy')}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t(`AddendumTypes.${addendum.type.replace(' ', '')}`)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(addendum.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{addendum.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 border-2 border-dashed rounded-lg">
            <Info className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground italic">
              {loading ? t('App.loading') : t('Contracts.noAddendums')}
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Contracts.addAddendum')}</DialogTitle>
            <DialogDescription>
              Cargue los detalles de la modificación firmada. Este registro no alterará los campos originales del contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">{t('Contracts.addendumDate')}</label>
              <div className="col-span-3">
                <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newAddendum.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newAddendum.date ? format(newAddendum.date, 'PPP', { locale: dateLocale }) : <span>{t('Forms.pickDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newAddendum.date}
                      onSelect={(date) => date && setNewAddendum({ ...newAddendum, date })}
                      onAccept={() => setDatePickerOpen(false)}
                      onCancel={() => setDatePickerOpen(false)}
                      initialFocus
                      captionLayout="dropdown"
                      startMonth={new Date(2000, 0)}
                      endMonth={new Date(2050, 11)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">{t('Contracts.addendumType')}</label>
              <div className="col-span-3">
                <Select 
                  value={newAddendum.type} 
                  onValueChange={(v: AddendumType) => setNewAddendum({ ...newAddendum, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addendumTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {t(`AddendumTypes.${type.replace(' ', '')}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-right text-sm font-medium mt-2">{t('Reports.reportDescription')}</label>
              <div className="col-span-3">
                <Textarea 
                  placeholder={t('Contracts.addendumDescription')}
                  value={newAddendum.description}
                  onChange={(e) => setNewAddendum({ ...newAddendum, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>{t('Auth.cancelLabel')}</Button>
            <Button onClick={handleAdd} disabled={!newAddendum.description}>
              {t('Forms.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
