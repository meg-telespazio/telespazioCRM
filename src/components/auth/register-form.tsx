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
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/firebase/client-provider';

// Password validation: min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const passwordValidation =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const getFormSchema = (t: (key: string) => string) =>
  z
    .object({
      firstName: z.string().min(2, t('Validation.firstNameMin')),
      lastName: z.string().min(2, t('Validation.lastNameMin')),
      email: z.string().email(t('Validation.invalidEmail')),
      password: z
        .string()
        .min(8, t('Validation.passwordMin'))
        .regex(passwordValidation, t('Validation.passwordPattern')),
      confirmPassword: z.string(),
      humanCheck: z.string().min(1, t('Validation.humanCheck')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('Validation.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

export function RegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();

  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('+');
  const [answer, setAnswer] = useState(0);

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
      // Ensure positive result for subtraction
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
      password: '',
      confirmPassword: '',
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

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;
      const displayName = `${values.firstName} ${values.lastName}`;

      await updateProfile(user, { displayName });

      const userProfileData = {
        uid: user.uid,
        email: user.email,
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: displayName,
      };

      const userDocRef = doc(firestore, 'users', user.uid);

      setDoc(userDocRef, userProfileData, { merge: true }).catch(
        async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      );

      toast({
        title: t('Auth.registerSuccessTitle'),
        description: t('Auth.registerSuccessDescription'),
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Auth.registerFailedTitle'),
        description: error.message,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Auth.firstNameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Auth.lastNameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Auth.emailLabel')}</FormLabel>
              <FormControl>
                <Input placeholder="m@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Auth.passwordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Auth.confirmPasswordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="humanCheck"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('Auth.humanCheckLabel', { num1, operation, num2 })}
              </FormLabel>
              <FormControl>
                <Input placeholder={t('Forms.yourAnswer')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {t('Auth.createAccountButton')}
        </Button>
      </form>
    </Form>
  );
}
