'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  multiFactor, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  TotpMultiFactorGenerator,
  TotpSecret,
  RecaptchaVerifier,
  sendEmailVerification,
  type MultiFactorInfo
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, CheckCircle2, Smartphone, AlertTriangle, Phone, MailCheck, ShieldAlert, QrCode, RefreshCw, PlusCircle, Trash2, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

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
  const [enrolledFactors, setEnrolledFactors] = useState<MultiFactorInfo[]>([]);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);

  const syncMfaStatus = () => {
    if (!auth.currentUser) return;
    const mfaUser = multiFactor(auth.currentUser);
    setEnrolledFactors(mfaUser.enrolledFactors);
    setShowEnrollmentForm(mfaUser.enrolledFactors.length === 0);
  };

  useEffect(() => {
    syncMfaStatus();

    if (!recaptchaVerifier && typeof window !== 'undefined') {
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        setRecaptchaVerifier(verifier);
      } catch (e) {
        console.warn('Recaptcha initialization failed:', e);
      }
    }
  }, [auth, auth.currentUser]);

  const isAppActive = enrolledFactors.some(f => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  const isSmsActive = enrolledFactors.some(f => f.factorId === PhoneAuthProvider.PHONE_SIGN_IN_METHOD);

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
      syncMfaStatus();
      setVerificationId(null);
      setMfaCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está protegida por SMS.' });
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
      const mfaUser = multiFactor(auth.currentUser);
      const mfaSession = await mfaUser.getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
      setTotpSecret(secret);
    } catch (error: any) {
      console.error("MFA TOTP Error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Servicio', 
        description: 'No se pudo generar el secreto. Verifica que el método TOTP esté activo en la consola.' 
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
      syncMfaStatus();
      setTotpSecret(null);
      setMfaCode('');
      toast({ variant: 'success', title: 'MFA Activado', description: 'Tu cuenta está protegida por la App.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Código Inválido', description: 'El código ingresado no es correcto.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async (factorUid: string) => {
    if (!auth.currentUser || !window.confirm('¿Estás seguro de que quieres desactivar este factor de seguridad?')) return;
    setIsLoading(true);
    try {
      const mfaUser = multiFactor(auth.currentUser);
      const factor = mfaUser.enrolledFactors.find(f => f.uid === factorUid);
      if (factor) {
        await mfaUser.unenroll(factor);
        syncMfaStatus();
        toast({ variant: 'default', title: 'Factor Desactivado' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

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

      <CardContent className="p-6 space-y-6">
        {/* Active Factors List */}
        {enrolledFactors.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Métodos Activos</h4>
            <div className="grid gap-3">
              {enrolledFactors.map(factor => {
                const isTotp = factor.factorId === TotpMultiFactorGenerator.FACTOR_ID;
                return (
                  <div key={factor.uid} className="flex items-center justify-between p-4 rounded-xl border bg-primary/5 border-primary/10 group animate-in fade-in">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {isTotp ? <Smartphone className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{isTotp ? 'Authenticator App' : 'Verificación por SMS'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{(factor as any).displayName || factor.factorId}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDisableMfa(factor.uid)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enrollment Interface */}
        {!showEnrollmentForm ? (
          <Button 
            variant="outline" 
            className="w-full h-12 border-dashed gap-2 text-primary font-bold"
            onClick={() => setShowEnrollmentForm(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Vincular nuevo factor de seguridad
          </Button>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <Separator />
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">Vincular Nuevo Método</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowEnrollmentForm(false)} className="text-xs">Cancelar</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                <TabsTrigger value="app" className="gap-2 font-bold"><Smartphone className="h-4 w-4" /> App de Autenticación</TabsTrigger>
                <TabsTrigger value="sms" className="gap-2 font-bold"><Phone className="h-4 w-4" /> SMS</TabsTrigger>
              </TabsList>

              <TabsContent value="app" className="space-y-4 pt-4">
                {!auth.currentUser?.emailVerified ? (
                   <div className="py-8 text-center bg-red-50 rounded-xl border border-red-100 space-y-4">
                      <div className="bg-white p-3 rounded-full w-fit mx-auto shadow-sm">
                        <MailCheck className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-red-900">Email No Verificado</p>
                        <p className="text-xs text-red-700 px-8 leading-relaxed">Firebase exige que tu cuenta esté validada para enrolar una aplicación.</p>
                      </div>
                      <Button 
                        onClick={handleSendVerification} 
                        disabled={isSendingVerification}
                        className="bg-red-600 hover:bg-red-700 font-bold"
                      >
                        {isSendingVerification ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MailCheck className="h-4 w-4 mr-1" />}
                        Enviar Email de Validación
                      </Button>
                   </div>
                ) : !totpSecret ? (
                  <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed">
                    <QrCode className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto font-medium">Usa Google Authenticator o Microsoft Authenticator para generar códigos de 6 dígitos.</p>
                    <Button onClick={handleInitiateTotp} disabled={isLoading} className="h-11 px-8 font-bold shadow-md">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                      Generar Código QR de Vinculación
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in zoom-in-95">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">1</Badge>
                        <p className="text-sm font-bold">Escanea este código con tu App móvil</p>
                      </div>
                      <div className="flex justify-center bg-white p-6 rounded-xl border-2 shadow-inner">
                        <QRCodeSVG 
                          value={totpSecret.generateQrCodeUrl(auth.currentUser?.email || '', 'T-Track Sales')} 
                          size={220}
                          includeMargin={true}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Clave Manual</p>
                        <code className="text-xs bg-slate-900 text-white px-3 py-2 rounded-md select-all block mt-1 tracking-widest font-mono">{totpSecret.secretKey}</code>
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <div className="flex items-center gap-2">
                        <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">2</Badge>
                        <p className="text-sm font-bold">Confirma ingresando el código de la App</p>
                      </div>
                      <Input 
                        placeholder="123456" 
                        value={mfaCode} 
                        onChange={(e) => setMfaCode(e.target.value)} 
                        disabled={isLoading}
                        className="text-center font-black text-2xl tracking-[0.5em] h-14 bg-slate-50 border-2"
                        maxLength={6}
                        autoFocus
                      />
                      <Button onClick={handleVerifyTotp} disabled={isLoading || mfaCode.length !== 6} className="w-full h-12 font-bold shadow-md">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verificar y Activar Factor
                      </Button>
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
                          placeholder="+54 11 ..." 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)} 
                          disabled={isLoading}
                          className="h-11"
                        />
                        <Button onClick={handleSendSmsCode} disabled={isLoading || !phoneNumber}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Enviar SMS
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3 text-center">
                      <Label className="text-sm font-bold">Código recibido por SMS</Label>
                      <Input 
                        placeholder="123456" 
                        value={mfaCode} 
                        onChange={(e) => setMfaCode(e.target.value)} 
                        disabled={isLoading}
                        className="text-center font-black text-2xl tracking-[0.5em] h-14 bg-slate-50 border-2"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleVerifySms} disabled={isLoading || !mfaCode} className="w-full h-12 font-bold shadow-md">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Validar y Activar
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
