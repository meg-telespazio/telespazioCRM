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
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPassword) {
      timer = setTimeout(() => {
        setShowPassword(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [showPassword]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmPassword) {
      timer = setTimeout(() => {
        setShowConfirmPassword(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [showConfirmPassword]);

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

  const password = form.watch('password', '');

  const passwordChecks = useMemo(() => {
    return [
      {
        labelKey: 'Validation.passwordLength',
        met: password.length >= 8,
      },
      {
        labelKey: 'Validation.passwordUppercase',
        met: /[A-Z]/.test(password),
      },
      {
        labelKey: 'Validation.passwordLowercase',
        met: /[a-z]/.test(password),
      },
      {
        labelKey: 'Validation.passwordNumber',
        met: /\d/.test(password),
      },
      {
        labelKey: 'Validation.passwordSpecial',
        met: /[@$!%*?&]/.test(password),
      },
    ];
  }, [password]);

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
        variant: 'success',
        title: t('Auth.registerSuccessTitle'),
        description: t('Auth.registerSuccessDescription'),
      });
      router.push('/login');
    } catch (error: any) {
      const errorCode = error.code;
      let description = error.message; // Default to Firebase's message

      if (errorCode === 'auth/email-already-in-use') {
        description = t('Auth.emailAlreadyInUse');
      } else if (errorCode === 'auth/operation-not-allowed') {
        description = t('Auth.operationNotAllowed');
      } else if (errorCode) {
        // A fallback for any other Firebase error with a code
        description = `Error (${errorCode}): ${description}`;
      }
      // If no code, 'description' remains error.message

      toast({
        variant: 'destructive',
        title: t('Auth.registerFailedTitle'),
        description: description,
      });
    }
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

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
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...field}
                    className="pr-10"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {password && (
          <div className="space-y-1">
            {passwordChecks.map((check) => (
              <p
                key={check.labelKey}
                className={cn(
                  'flex items-center text-sm',
                  check.met ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {check.met ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                {t(check.labelKey)}
              </p>
            ))}
          </div>
        )}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Auth.confirmPasswordLabel')}</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...field}
                    className="pr-10"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3"
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
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
