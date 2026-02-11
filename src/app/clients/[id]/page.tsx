'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { doc } from 'firebase/firestore';
import { addClient, updateClient } from '@/lib/firestore/clients';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { translations } from '@/lib/translations';

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

type ClientFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ClientFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();

  const clientId = params.id as string;
  const isNew = clientId === 'new';

  const clientDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, isNew]);

  const { data: clientData, loading: clientLoading } =
    useDoc<Client>(clientDocRef);

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      website: '',
      email: '',
      phone: '',
      cuit: '',
      status: 'active',
      industry: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (clientData) {
      form.reset({
        ...clientData,
        cuit: clientData.cuit ? formatCuit(clientData.cuit) : '',
        website: clientData.website || '',
        notes: clientData.notes || '',
      });
    }
  }, [clientData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  async function onSubmit(values: ClientFormData) {
    if (!user) return;
    try {
      if (isNew) {
        await addClient(firestore, user.uid, values);
        toast({
          variant: 'success',
          title: t('Forms.saveClient'),
          description: `Client ${values.name} has been created.`,
        });
      } else {
        await updateClient(firestore, clientId, values);
        toast({
          variant: 'success',
          title: t('Forms.saveClient'),
          description: `Client ${values.name} has been updated.`,
        });
      }
      router.push('/clients');
    } catch (error: any) {
      console.error('Failed to save client:', error);
      if (error.message.includes('CUIT')) {
        form.setError('cuit', { type: 'manual', message: error.message });
      } else {
        toast({
          variant: 'destructive',
          title: t('Auth.registerFailedTitle'),
          description: error.message,
        });
      }
    }
  }

  const pageIsLoading = userLoading || (clientLoading && !isNew);

  if (pageIsLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={isNew ? t('Forms.addClient') : t('Forms.editClient')} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-[70vh] w-full" />
          </div>
        </main>
      </div>
    );
  }

  const statusOptions: Client['status'][] = ['active', 'suspended', 'canceled'];
  const industryOptions = Object.keys(translations.en.Industries).sort((a, b) =>
    t(`Industries.${a}`).localeCompare(t(`Industries.${b}`))
  );

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isNew ? t('Forms.addClient') : t('Forms.editClient')} />
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="space-y-4 p-6">
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
                          <Input
                            placeholder="XX-XXXXXXXX-X"
                            {...field}
                            disabled={!isNew}
                          />
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
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/clients')}
                >
                  {t('Auth.cancelLabel')}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? t('App.loading')
                    : t('Forms.saveClient')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
