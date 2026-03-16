
'use client';

import { useState, useEffect } from 'react';
import { 
  multiFactor, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  TotpMultiFactorGenerator,
  TotpSecret,
  RecaptchaVerifier 
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, CheckCircle2, QrCode, Phone, Smartphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';

export function MfaEnrollment() {
  const auth = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('sms');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaActive, setIsMfaActive] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const mfaUser = multiFactor(auth.currentUser);
    setIsMfaActive(mfaUser.enrolledFactors.length > 0);

    if (!recaptchaVerifier && typeof window !== 'undefined') {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      setRecaptchaVerifier(verifier);
    }
  }, [auth, auth.currentUser, recaptchaVerifier]);

  const handleSendSmsCode = async () => {
    if (!auth.currentUser || !phoneNumber || !recaptchaVerifier) return;
    setIsLoading(true);
    try {
      const mfaSession = await multiFactor(auth.currentUser).getSession();
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const vId = await phoneAuthProvider.verifyPhoneNumber(
        { phoneNumber, session: mfaSession },
        recaptchaVerifier
      );
      setVerificationId(vId);
      toast({ variant: 'default', title: 'Código Enviado', description: 'Revisa tus mensajes SMS.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    if (!auth.currentUser || !verificationId || !code) return;
    setIsLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, code);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'SMS Phone');
      setIsMfaActive(true);
      setVerificationId(null);
      setCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está ahora protegida por SMS.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verificación fallida', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateTotp = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const mfaSession = await multiFactor(auth.currentUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
      setTotpSecret(secret);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!auth.currentUser || !totpSecret || !code) return;
    setIsLoading(true);
    try {
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'Authenticator App');
      setIsMfaActive(true);
      setTotpSecret(null);
      setCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está protegida por la App de Autenticación.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Código Inválido', description: 'El código ingresado no es correcto.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!auth.currentUser || !window.confirm('¿Estás seguro de que quieres desactivar la seguridad de doble factor?')) return;
    setIsLoading(true);
    try {
      const mfaUser = multiFactor(auth.currentUser);
      const factor = mfaUser.enrolledFactors[0];
      await mfaUser.unenroll(factor);
      setIsMfaActive(false);
      toast({ variant: 'default', title: 'MFA Desactivado' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isMfaActive) {
    return (
      <Card className="mt-6 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>{t('Auth.mfaEnrollTitle')}</CardTitle>
          </div>
          <CardDescription>{t('Auth.mfaEnrollDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <p className="font-bold text-green-700">{t('Auth.mfaActive')}</p>
          <Button variant="outline" className="text-destructive border-destructive" onClick={handleDisableMfa} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Auth.mfaDisable')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>{t('Auth.mfaEnrollTitle')}</CardTitle>
        </div>
        <CardDescription>{t('Auth.mfaEnrollDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sms" className="gap-2"><Phone className="h-4 w-4" /> SMS</TabsTrigger>
            <TabsTrigger value="app" className="gap-2"><Smartphone className="h-4 w-4" /> App</TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-4 pt-4">
            {!verificationId ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('Auth.mfaPhoneLabel')}</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="+54 11 ..." 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      disabled={isLoading}
                    />
                    <Button onClick={handleSendSmsCode} disabled={isLoading || !phoneNumber}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('Auth.mfaSendCode')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <Label>{t('Auth.mfaCodeLabel')}</Label>
                  <Input 
                    placeholder="123456" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    disabled={isLoading}
                    className="text-center font-bold text-lg tracking-widest"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleVerifySms} disabled={isLoading || !code}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('Auth.mfaVerifyAndEnroll')}
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => setVerificationId(null)}>
                    {t('Actions.back')}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="app" className="space-y-4 pt-4">
            {!totpSecret ? (
              <div className="py-4 text-center">
                <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-6">Usa aplicaciones como Google Authenticator o Authy para generar códigos de seguridad.</p>
                <Button onClick={handleInitiateTotp} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Configurar Autenticador
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-bold">{t('Auth.mfaAppStep1')}</p>
                  <div className="flex justify-center bg-white p-4 rounded-lg border">
                    <QRCodeSVG 
                      value={totpSecret.generateQrCodeUrl(auth.currentUser?.email || '', 'T-Track Sales')} 
                      size={200}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('Auth.mfaSecretKey')}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded select-all">{totpSecret.secretKey}</code>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm font-bold">{t('Auth.mfaAppStep2')}</p>
                  <Input 
                    placeholder="123456" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    disabled={isLoading}
                    className="text-center font-bold text-lg tracking-widest"
                  />
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleVerifyTotp} disabled={isLoading || code.length !== 6}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('Auth.mfaVerifyAndEnroll')}
                    </Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setTotpSecret(null)}>
                      {t('Actions.back')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <div id="recaptcha-container"></div>
      </CardContent>
    </Card>
  );
}
