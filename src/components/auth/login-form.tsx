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
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  getMultiFactorResolver, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  RecaptchaVerifier,
  MultiFactorResolver
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/firebase/client-provider';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Loader2, Smartphone, MessageSquare, ShieldCheck, ChevronRight } from 'lucide-react';

export function LoginForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA States
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaHints, setMfaHints] = useState<any[]>([]);
  const [selectedHint, setSelectedHint] = useState<any>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMethod, setMfaMethod] = useState<'sms' | 'totp' | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !recaptchaVerifier) {
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        setRecaptchaVerifier(verifier);
      } catch (e) {
        console.warn('Recaptcha init failed:', e);
      }
    }
    return () => {
      if (recaptchaVerifier) recaptchaVerifier.clear();
    };
  }, [auth, recaptchaVerifier]);

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

  const handleSelectMfaMethod = useCallback(async (hint: any, resolver: MultiFactorResolver) => {
    setSelectedHint(hint);
    setIsLoading(true);
    try {
      if (hint.factorId === TotpMultiFactorGenerator.FACTOR_ID) {
        setMfaMethod('totp');
      } else if (hint.factorId === PhoneAuthProvider.PHONE_SIGN_IN_METHOD) {
        setMfaMethod('sms');
        if (recaptchaVerifier) {
          const phoneAuthProvider = new PhoneAuthProvider(auth);
          // Usamos el resolver pasado por argumento para evitar el error de sesión null
          const vId = await phoneAuthProvider.verifyPhoneNumber(
            { multiFactorHint: hint, session: resolver.session },
            recaptchaVerifier
          );
          setVerificationId(vId);
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error MFA', description: error.message });
      setSelectedHint(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth, recaptchaVerifier, toast]);

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
        setMfaHints(resolver.hints);
        
        // Si solo hay uno, lo seleccionamos automáticamente pasando el resolver directo
        if (resolver.hints.length === 1) {
          handleSelectMfaMethod(resolver.hints[0], resolver);
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
      if (mfaMethod === 'totp' && selectedHint) {
        assertion = TotpMultiFactorGenerator.assertionForSignIn(selectedHint.uid, mfaCode);
      } else if (mfaMethod === 'sms' && verificationId) {
        const cred = PhoneAuthProvider.credential(verificationId, mfaCode);
        assertion = PhoneMultiFactorGenerator.assertion(cred);
      }

      if (assertion) {
        await mfaResolver.resolveSignIn(assertion);
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Código Inválido', description: 'Por favor verifique el código ingresado.' });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // VISTA: Selección de Método
  if (mfaResolver && !selectedHint) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Seguridad de la Cuenta</h3>
          <p className="text-sm text-muted-foreground">Seleccione cómo desea recibir su código de verificación:</p>
        </div>
        
        <div className="grid gap-3">
          {mfaHints.map((hint, idx) => {
            const isTotp = hint.factorId === TotpMultiFactorGenerator.FACTOR_ID;
            return (
              <Button 
                key={idx} 
                variant="outline" 
                className="h-16 justify-between px-6 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                onClick={() => handleSelectMfaMethod(hint, mfaResolver)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-4">
                  {isTotp ? <Smartphone className="h-6 w-6 text-primary" /> : <MessageSquare className="h-6 w-6 text-primary" />}
                  <div className="text-left">
                    <p className="font-bold text-sm text-slate-900">{isTotp ? 'App de Autenticación' : 'Mensaje SMS'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                      {isTotp ? 'Google / Microsoft Authenticator' : hint.displayName || 'Teléfono vinculado'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
              </Button>
            );
          })}
        </div>
        
        <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setMfaResolver(null)}>
          {t('Actions.back')}
        </Button>
      </div>
    );
  }

  // VISTA: Ingreso de Código
  if (selectedHint) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              {mfaMethod === 'totp' ? <Smartphone className="h-6 w-6 text-primary" /> : <MessageSquare className="h-6 w-6 text-primary" />}
            </div>
          </div>
          <h3 className="font-black text-xl text-slate-900">Verificación</h3>
          <p className="text-xs text-muted-foreground px-6">
            {mfaMethod === 'totp' ? 'Ingrese el código de 6 dígitos de su aplicación.' : 'Hemos enviado un SMS a su teléfono.'}
          </p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Input 
              placeholder="123456" 
              value={mfaCode} 
              onChange={(e) => setMfaCode(e.target.value)}
              className="text-center tracking-[0.5em] font-black text-3xl h-16 bg-slate-50 border-2 focus-visible:ring-primary"
              maxLength={6}
              autoFocus
            />
          </div>
          <Button className="w-full h-12 text-md font-bold shadow-lg" onClick={handleVerifyMfa} disabled={isLoading || mfaCode.length !== 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validar y Entrar
          </Button>
          
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="text-xs" onClick={() => setSelectedHint(null)}>
              Cambiar método de verificación
            </Button>
          </div>
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
        <Button type="submit" className="w-full h-11 font-bold" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('Auth.loginButton')}
        </Button>
      </form>
    </Form>
  );
}
