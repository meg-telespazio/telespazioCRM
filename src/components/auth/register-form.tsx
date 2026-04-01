
'use client';

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
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/firebase/client-provider';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    firstName: z.string().min(2, t('Validation.firstNameMin')),
    lastName: z.string().min(2, t('Validation.lastNameMin')),
    email: z.string().email(t('Validation.invalidEmail')),
    phone: z.string().min(10, t('Validation.phoneMin')),
    management: z.enum(['Satellite Communications', 'GeoInformacion'], {
      required_error: t('Validation.fieldRequired'),
    }),
    notes: z.string().optional(),
    humanCheck: z.string().min(1, t('Validation.humanCheck')),
  });

export function RegisterForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();

  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('+');
  const [answer, setAnswer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateHumanCheck = () => {
    const n1 = Math.floor(Math.random() * 90) + 10;
    const n2 = Math.floor(Math.random() * 90) + 10;
    const isSum = Math.random() > 0.5;

    if (isSum) {
      setNum1(n1);
      setNum2(n2);
      setOperation('+');
      setAnswer(n1 + n2);
    } else {
      if (n1 > n2) {
        setNum1(n1);
        setNum2(n2);
        setAnswer(n1 - n2);
      } else {
        setNum1(n2);
        setNum2(n1);
        setAnswer(n2 - n1);
      }
      setOperation('-');
    }
  };

  useEffect(() => {
    generateHumanCheck();
  }, []);

  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      management: undefined,
      notes: '',
      humanCheck: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (parseInt(values.humanCheck) !== answer) {
      form.setError('humanCheck', {
        type: 'manual',
        message: t('Validation.humanCheckError'),
      });
      generateHumanCheck();
      return;
    }

    setIsSubmitting(true);
    try {
      const requestsRef = collection(firestore, 'accessRequests');
      await addDoc(requestsRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        management: values.management,
        notes: values.notes || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        adminToNotify: 'mariano.gonzalez@telespazio.com'
      });

      toast({
        variant: 'success',
        title: t('Auth.registerSuccessTitle'),
        description: t('Auth.registerSuccessDescription'),
      });
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Auth.registerFailedTitle'),
        description: error.message || 'Error sending request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem><FormLabel>{t('Auth.firstNameLabel')}</FormLabel><FormControl><Input placeholder="John" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem><FormLabel>{t('Auth.lastNameLabel')}</FormLabel><FormControl><Input placeholder="Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>{t('Auth.emailLabel')}</FormLabel><FormControl><Input placeholder="m@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>{t('Auth.phoneLabel')}</FormLabel><FormControl><Input placeholder="+54..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="management" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Profile.management')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
              <FormControl><SelectTrigger><SelectValue placeholder={t('Profile.management')} /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Satellite Communications">{t('Management.SatelliteCommunications')}</SelectItem>
                <SelectItem value="GeoInformacion">{t('Management.GeoInformacion')}</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Forms.notes')}</FormLabel>
            <FormControl><Textarea placeholder={t('Forms.notesPlaceholder')} {...field} disabled={isSubmitting} className="resize-none" rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="humanCheck" render={({ field }) => (
          <FormItem><FormLabel>{t('Auth.humanCheckLabel', { num1, operation, num2 })}</FormLabel><FormControl><Input placeholder={t('Forms.yourAnswer')} {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {t('Auth.createAccountButton')}
        </Button>
      </form>
    </Form>
  );
}
