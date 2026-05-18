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
import { useAuth, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, CheckCircle2, Smartphone, AlertTriangle, Phone, MailCheck, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { sendEmailVerification } from 'firebase/auth';

export function MfaEnrollment() {
  const auth = useAuth();
  const { user } = useUser();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('app');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
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

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({
        variant: 'success',
        title: 'Correo Enviado',
        description: 'Revisa tu bandeja de entrada para validar tu cuenta.',
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSendingVerification(false);
    }
  };

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
    if (!auth.currentUser || !verificationId || !mfaCode) return;
    setIsLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, mfaCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'SMS Phone');
      setIsMfaActive(true);
      setVerificationId(null);
      setMfaCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está ahora protegida por SMS.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verificación fallida', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateTotp = async () => {
    if (!auth.currentUser) return;
    
    if (!auth.currentUser.emailVerified) {
      toast({ 
        variant: 'destructive', 
        title: 'Verificación Requerida', 
        description: 'Debes verificar tu correo electrónico antes de activar el Autenticador.' 
      });
      return;
    }

    setIsLoading(true);
    try {
      const mfaSession = await multiFactor(auth.currentUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
      setTotpSecret(secret);
    } catch (error: any) {
      console.error("MFA Secret Generation Error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Servicio no disponible', 
        description: 'No se pudo iniciar la configuración. Contacte a soporte si el error persiste.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!auth.currentUser || !totpSecret || !mfaCode) return;
    setIsLoading(true);
    try {
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, mfaCode);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'Authenticator App');
      setIsMfaActive(true);
      setTotpSecret(null);
      setMfaCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está protegida por la App de Autenticación.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Código Inválido', description: 'El código ingresado no es correcto o ha expirado.' });
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
      <Card className="mt-6 border-primary/20 bg-primary/5 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>{t('Auth.mfaEnrollTitle')}</CardTitle>
            </div>
            {user?.mfaEnforced && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px] font-bold">
                <ShieldAlert className="h-3 w-3" />
                OBLIGATORIO
              </Badge>
            )}
          </div>
          <CardDescription>{t('Auth.mfaEnrollDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="p-4 bg-green-100 rounded-full">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-xl text-green-700">{t('Auth.mfaActive')}</p>
            <p className="text-xs text-muted-foreground italic">Protección activa mediante dispositivo de confianza.</p>
          </div>
          <Button variant="outline" className="mt-4 text-destructive border-destructive hover:bg-destructive/5" onClick={handleDisableMfa} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Auth.mfaDisable')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">{t('Auth.mfaEnrollTitle')}</CardTitle>
          </div>
          {user?.mfaEnforced && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px] font-bold">
              <ShieldAlert className="h-3 w-3" />
              OBLIGATORIO
            </Badge>
          )}
        </div>
        <CardDescription>{t('Auth.mfaEnrollDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!auth.currentUser?.emailVerified && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 font-bold uppercase text-[10px]">Paso 1: Verificar tu Email</AlertTitle>
            <AlertDescription className="text-red-700 text-xs space-y-3">
              <p>Por seguridad, debes verificar tu email corporativo antes de habilitar aplicaciones de autenticación.</p>
              <Button 
                onClick={handleSendVerification} 
                disabled={isSendingVerification}
                variant="outline"
                className="bg-white border-red-200 text-red-700 hover:bg-red-100 font-bold h-8"
              >
                {isSendingVerification ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <MailCheck className="h-3 w-3 mr-2" />}
                Enviar enlace de verificación
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="app" className="gap-2 font-bold"><Smartphone className="h-4 w-4" /> App de Autenticación</TabsTrigger>
            <TabsTrigger value="sms" className="gap-2 font-bold"><Phone className="h-4 w-4" /> SMS</TabsTrigger>
          </TabsList>

          <TabsContent value="app" className="space-y-4 pt-4">
            {!totpSecret ? (
              <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed">
                <Smartphone className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto font-medium">Usa Google Authenticator o Microsoft Authenticator para generar códigos de seguridad.</p>
                <Button onClick={handleInitiateTotp} disabled={isLoading || !auth.currentUser?.emailVerified} className="h-11 px-8 font-bold">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Código QR
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">1</Badge>
                    <p className="text-sm font-bold">Escanea este código con tu App</p>
                  </div>
                  <div className="flex justify-center bg-white p-6 rounded-xl border-2 shadow-inner">
                    <QRCodeSVG 
                      value={totpSecret.generateQrCodeUrl(auth.currentUser?.email || '', 'T-Track Sales')} 
                      size={220}
                      includeMargin={true}
                      level="H"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Clave Secreta (ingreso manual)</p>
                    <code className="text-xs bg-slate-900 text-white px-3 py-2 rounded-md select-all font-mono border block mt-1 tracking-widest">{totpSecret.secretKey}</code>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">2</Badge>
                    <p className="text-sm font-bold">Ingresa el código de 6 dígitos</p>
                  </div>
                  <Input 
                    placeholder="123456" 
                    value={mfaCode} 
                    onChange={(e) => setMfaCode(e.target.value)} 
                    disabled={isLoading}
                    className="text-center font-black text-2xl tracking-[0.5em] h-14 bg-slate-50 border-2"
                    maxLength={6}
                  />
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleVerifyTotp} disabled={isLoading || mfaCode.length !== 6} className="h-12 text-md font-bold">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verificar y Activar
                    </Button>
                    <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setTotpSecret(null)}>
                      {t('Actions.back')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 pt-4">
            {!verificationId ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Número de Teléfono</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="+54 11 1234 5678" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      disabled={isLoading}
                      className="h-11"
                    />
                    <Button onClick={handleSendSmsCode} disabled={isLoading || !phoneNumber} className="h-11 font-bold">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('Auth.mfaSendCode')}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Incluye el código de país (ej: +54 para Argentina).</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-2">
                <div className="space-y-3 text-center">
                  <Label className="text-sm font-bold">Código recibido por SMS</Label>
                  <Input 
                    placeholder="123456" 
                    value={mfaCode} 
                    onChange={(e) => setMfaCode(e.target.value)} 
                    disabled={isLoading}
                    className="text-center font-black text-2xl tracking-[0.5em] h-14 bg-slate-50 border-2"
                    maxLength={6}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleVerifySms} disabled={isLoading || !mfaCode} className="h-12 font-bold">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar y Activar
                  </Button>
                  <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setVerificationId(null)}>
                    {t('Actions.back')}
                  </Button>
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
