'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ProductOrService } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { translations } from '@/lib/translations';
import { Card, CardContent } from '../ui/card';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    type: z.enum(['product', 'service']),
    name: z.string().min(2, t('Validation.itemNameMin')),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    unitOfMeasure: z.enum(['units', 'meters', 'kg', 'liters', 'GB']),
    oneTimeCharge: z.coerce.number().min(0, t('Validation.itemChargeMin')).optional(),
    recurringCharge: z.coerce.number().min(0, t('Validation.itemChargeMin')).optional(),
    currency: z.enum(['USD', 'EUR', 'ARS']),
    isEditable: z.boolean().default(false),
    availableDiscounts: z
      .string()
      .optional()
      .transform((val) =>
        val ? val.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : []
      ),
  });

type ItemFormData = z.infer<ReturnType<typeof getFormSchema>>;

type ProductServiceFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (
    item: Omit<ProductOrService, 'id' | 'publicId' | 'createdAt' | 'createdBy'>
  ) => void;
  defaultValues?: Partial<ProductOrService>;
};

export function ProductServiceForm({
  isOpen,
  onOpenChange,
  onSave,
  defaultValues,
}: ProductServiceFormProps) {
  const { t } = useI18n();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
      ? {
          ...defaultValues,
          availableDiscounts: defaultValues.availableDiscounts?.join(', ') || '',
        }
      : {
          type: 'product',
          name: '',
          description: '',
          status: 'active',
          unitOfMeasure: 'units',
          oneTimeCharge: 0,
          recurringCharge: 0,
          currency: 'USD',
          isEditable: false,
          availableDiscounts: '',
        },
  });

  function onSubmit(values: ItemFormData) {
    onSave(values as any);
    form.reset();
    onOpenChange(false);
  }

  const statusOptions: ProductOrService['status'][] = ['active', 'inactive'];
  const unitOptions: ProductOrService['unitOfMeasure'][] = ['units', 'meters', 'kg', 'liters', 'GB'];
  const currencyOptions: ProductOrService['currency'][] = ['USD', 'EUR', 'ARS'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            {defaultValues ? t('PS.editItem') : t('PS.addItem')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form
              id="ps-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 px-6 py-4"
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{t('PS.itemType')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="product" />
                          </FormControl>
                          <FormLabel className="font-normal">{t('PS.product')}</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="service" />
                          </FormControl>
                          <FormLabel className="font-normal">{t('PS.service')}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('PS.itemName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('PS.itemNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('PS.itemDescription')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('PS.itemDescriptionPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('PS.status')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('PS.selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(`Status.${status}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <Card>
                <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="unitOfMeasure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('PS.unitOfMeasure')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t('PS.selectUnit')} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {unitOptions.map((unit) => (
                              <SelectItem key={unit} value={unit}>{t(`UnitOfMeasures.${unit}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('PS.currency')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                              {currencyOptions.map((currency) => (
                                <SelectItem key={currency} value={currency}>{t(`Currencies.${currency}`)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="oneTimeCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('PS.oneTimeCharge')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('PS.chargePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recurringCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('PS.recurringCharge')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('PS.chargePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="availableDiscounts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('PS.availableDiscounts')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('PS.discountsPlaceholder')} {...field} />
                    </FormControl>
                     <FormDescription>{t('Validation.itemDiscountFormat')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isEditable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('PS.isEditable')}</FormLabel>
                      <FormDescription>{t('PS.isEditableDesc')}</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('Auth.cancelLabel')}
          </Button>
          <Button type="submit" form="ps-form">
            {t('PS.saveItem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
