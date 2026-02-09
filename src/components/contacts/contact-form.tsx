'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import type { Contact, Client, EmailEntry, PhoneEntry, ContactPosition, ContactArea } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const positionOptions: ContactPosition[] = ['Analyst', 'CEO', 'CFO', 'CIO', 'CISO', 'Head', 'Manager'];
const areaOptions: ContactArea[] = ['Administration', 'IT', 'Legal', 'Marketing', 'Procurement', 'Sales', 'Supplier Payments'];

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t('Validation.nameMin')),
    clientId: z.string().min(1, t('Validation.selectClient')),
    position: z.enum(positionOptions).optional(),
    area: z.enum(areaOptions).optional(),
    emails: z
      .array(
        z.object({
          type: z.enum(['work', 'personal', 'other']),
          address: z.string().email(t('Validation.invalidEmail')),
        })
      )
      .optional(),
    phones: z
      .array(
        z.object({
          type: z.enum(['mobile', 'landline', 'work', 'home']),
          number: z.string().min(10, t('Validation.phoneMin')),
        })
      )
      .optional(),
    notes: z.string().optional(),
  });

type ContactFormData = z.infer<ReturnType<typeof getFormSchema>>;

type ContactFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Omit<Contact, 'id' | 'publicId' | 'createdAt' | 'createdBy'>) => void;
  defaultValues?: Partial<Contact>;
  clients: Client[];
};

export function ContactForm({
  isOpen,
  onOpenChange,
  onSave,
  defaultValues,
  clients,
}: ContactFormProps) {
  const { t } = useI18n();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: '',
      clientId: '',
      position: undefined,
      area: undefined,
      emails: [{ type: 'work', address: '' }],
      phones: [{ type: 'mobile', number: '' }],
      notes: '',
    },
  });

  const {
    fields: emailFields,
    append: appendEmail,
    remove: removeEmail,
  } = useFieldArray({
    control: form.control,
    name: 'emails',
  });

  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({
    control: form.control,
    name: 'phones',
  });

  function onSubmit(values: ContactFormData) {
    onSave(values as Omit<Contact, 'id' | 'publicId'| 'createdAt' | 'createdBy'>);
    form.reset();
    onOpenChange(false);
  }

  const emailTypeOptions: EmailEntry['type'][] = ['work', 'personal', 'other'];
  const phoneTypeOptions: PhoneEntry['type'][] = ['mobile', 'landline', 'work', 'home'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            {defaultValues ? t('Forms.editContact') : t('Forms.addContact')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 px-6 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Forms.contactName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Forms.contactNamePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Pages.clients')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Forms.selectClient')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.position')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Forms.selectPosition')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positionOptions.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {t(`ContactPositions.${pos}`)}
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
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Forms.area')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Forms.selectArea')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areaOptions.map((area) => (
                            <SelectItem key={area} value={area}>
                              {t(`ContactAreas.${area.replace(' ', '')}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />

              <div>
                <FormLabel className="text-base font-semibold">{t('Forms.emails')}</FormLabel>
                <div className="space-y-4 mt-2">
                  {emailFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`emails.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="w-1/3">
                            <FormLabel>{t('Forms.status')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                              <SelectContent>
                                {emailTypeOptions.map(type => <SelectItem key={type} value={type}>{t(`EmailTypes.${type}`)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emails.${index}.address`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{t('Auth.emailLabel')}</FormLabel>
                            <FormControl><Input placeholder={t('Forms.contactEmailPlaceholder')} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                 <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendEmail({ type: 'work', address: '' })}>
                    {t('Forms.addEmail')}
                </Button>
              </div>

             <Separator />

              <div>
                <FormLabel className="text-base font-semibold">{t('Forms.phones')}</FormLabel>
                 <div className="space-y-4 mt-2">
                  {phoneFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`phones.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="w-1/3">
                             <FormLabel>{t('Forms.status')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                              <SelectContent>
                                {phoneTypeOptions.map(type => <SelectItem key={type} value={type}>{t(`PhoneTypes.${type}`)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`phones.${index}.number`}
                        render={({ field }) => (
                           <FormItem className="flex-1">
                            <FormLabel>{t('Auth.phoneLabel')}</FormLabel>
                            <FormControl><Input placeholder={t('Forms.clientPhonePlaceholder')} {...field} /></FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                 <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendPhone({ type: 'mobile', number: '' })}>
                    {t('Forms.addPhone')}
                </Button>
              </div>

               <Separator />

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
            {t('Forms.saveContact')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
