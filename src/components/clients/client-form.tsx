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
import type { Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useMemo } from 'react';
import { translations } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';

const formatCuit = (cuit: string): string => {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.nameMin')),
    website: z
      .string()
      .url({ message: t('Validation.invalidUrl') })
      .optional()
      .or(z.literal('')),
    email: z.string().email(t('Validation.invalidEmail')),
    phone: z.string().min(10, t('Validation.phoneMin')),
    cuit: z
      .string()
      .min(1, t('Validation.cuitRequired'))
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 11, {
        message: t('Validation.cuitInvalid'),
      }),
    status: z.enum(['active', 'suspended', 'canceled']),
    industry: z.string().min(1, t('Validation.selectIndustry')),
    notes: z.string().optional(),
  });

type ClientFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (
    client: Omit<Client, 'id' | 'publicId' | 'createdAt' | 'createdBy'>
  ) => Promise<true | Error>;
  defaultValues?: Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy'>>;
};

export function ClientForm({
  isOpen,
  onOpenChange,
  onSave,
  defaultValues,
}: ClientFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
      ? {
          ...defaultValues,
          website: defaultValues.website || '',
          notes: defaultValues.notes || '',
          cuit: defaultValues.cuit ? formatCuit(defaultValues.cuit) : '',
        }
      : {
          name: '',
          website: '',
          email: '',
          phone: '',
          cuit: '00-00000000-0',
          status: 'active',
          industry: '',
          notes: '',
        },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await onSave(values);
    if (result === true) {
      form.reset();
      onOpenChange(false);
    } else if (result instanceof Error) {
      if (result.message.includes('CUIT')) {
        form.setError('cuit', { type: 'manual', message: result.message });
      } else {
        toast({
          variant: 'destructive',
          title: t('Auth.registerFailedTitle'),
          description: result.message,
        });
      }
    }
  }

  const statusOptions: Client['status'][] = ['active', 'suspended', 'canceled'];
  const industryOptions = Object.keys(translations.en.Industries).sort((a, b) =>
    t(`Industries.${a}`).localeCompare(t(`Industries.${b}`))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            {defaultValues ? t('Forms.editClient') : t('Forms.addClient')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-6 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Forms.clientName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Forms.clientNamePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Forms.website')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Forms.websitePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.clientEmail')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('Forms.clientEmailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.clientPhone')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('Forms.clientPhonePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Forms.cuit')}</FormLabel>
                    <FormControl>
                      <Input placeholder="XX-XXXXXXXX-X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.status')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('Forms.selectStatus')}
                            />
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
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.industry')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('Forms.selectIndustry')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryOptions.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {t(`Industries.${industry}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Forms.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('Forms.notesPlaceholder')}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
            {t('Forms.saveClient')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
