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
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/firebase/client-provider';
import { useMemo, useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('Validation.invalidEmail')),
        password: z.string().min(6, t('Validation.passwordMin')),
      }),
    [t]
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPassword) {
      timer = setTimeout(() => {
        setShowPassword(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [showPassword]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        variant: 'success',
        title: t('Auth.loginSuccessTitle'),
        description: t('Auth.loginSuccessDescription'),
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Auth.loginFailedTitle'),
        description: error.message,
      });
    }
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <Button type="submit" className="w-full">
          {t('Auth.loginButton')}
        </Button>
      </form>
    </Form>
  );
}
