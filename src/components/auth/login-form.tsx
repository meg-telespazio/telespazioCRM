
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
import { 
  signInWithEmailAndPassword, 
  getMultiFactorResolver, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/firebase/client-provider';
import { useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, Smartphone, MessageSquare } from 'lucide-react';

export function LoginForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA States
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMethod, setMfaMethod] = useState<'sms' | 'totp' | null>(null);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('Validation.invalidEmail')),
        password: z.string().min(6, t('Validation.passwordMin')),
      }),
    [t]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getAuthErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('Errors.login.invalidCredentials');
      case 'auth/too-many-requests':
        return t('Errors.login.tooManyRequests');
      case 'auth/network-request-failed':
        return t('Errors.login.networkError');
      default:
        return t('Errors.login.generic');
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        variant: 'success',
        title: t('Auth.loginSuccessTitle'),
        description: t('Auth.loginSuccessDescription'),
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error);
        setMfaResolver(resolver);
        
        const totpHint = resolver.hints.find((h: any) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        const phoneHint = resolver.hints.find((h: any) => h.factorId === PhoneAuthProvider.PHONE_SIGN_IN_METHOD);

        if (totpHint) {
          setMfaMethod('totp');
        } else if (phoneHint) {
          setMfaMethod('sms');
          const phoneAuthProvider = new PhoneAuthProvider(auth);
          const vId = await phoneAuthProvider.verifyPhoneNumber(
            { multiFactorHint: phoneHint, session: resolver.session },
            (auth as any).recaptchaVerifier
          );
          setVerificationId(vId);
        }
      } else {
        toast({
          variant: 'destructive',
          title: t('Auth.loginFailedTitle'),
          description: getAuthErrorMessage(error.code),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerifyMfa = async () => {
    if (!mfaResolver || !mfaCode) return;
    setIsLoading(true);
    try {
      let assertion;
      if (mfaMethod === 'totp') {
        const totpHint = mfaResolver.hints.find((h: any) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, mfaCode);
      } else if (mfaMethod === 'sms' && verificationId) {
        const cred = PhoneAuthProvider.credential(verificationId, mfaCode);
        assertion = PhoneMultiFactorGenerator.assertion(cred);
      }

      if (assertion) {
        await mfaResolver.resolveSignIn(assertion);
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'MFA Error', description: getAuthErrorMessage(error.code) });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  if (mfaResolver) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              {mfaMethod === 'totp' ? <Smartphone className="h-6 w-6 text-primary" /> : <MessageSquare className="h-6 w-6 text-primary" />}
            </div>
          </div>
          <h3 className="font-bold text-lg">{t('Auth.mfaRequired')}</h3>
          <p className="text-xs text-muted-foreground">
            {mfaMethod === 'totp' ? t('Auth.mfaMethodApp') : t('Auth.mfaMethodSms')}
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel>{t('Auth.mfaCodeLabel')}</FormLabel>
            <Input 
              placeholder="123456" 
              value={mfaCode} 
              onChange={(e) => setMfaCode(e.target.value)}
              className="text-center tracking-[0.5em] font-bold text-2xl h-12"
              maxLength={6}
            />
          </div>
          <Button className="w-full" onClick={handleVerifyMfa} disabled={isLoading || mfaCode.length !== 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Auth.verifyMfa')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMfaResolver(null)}>
            {t('Actions.back')}
          </Button>
        </div>
      </div>
    );
  }

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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('Auth.loginButton')}
        </Button>
      </form>
    </Form>
  );
}
