
'use client';

import { useState, useEffect } from 'react';
import { 
  multiFactor, 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  RecaptchaVerifier 
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, Loader2, Phone, CheckCircle2 } from 'lucide-react';

export function MfaEnrollment() {
  const auth = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaActive, setIsMfaActive] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const mfaUser = multiFactor(auth.currentUser);
    setIsMfaActive(mfaUser.enrolledFactors.length > 0);

    // Initialize invisible recaptcha
    if (!recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      setRecaptchaVerifier(verifier);
    }
  }, [auth, auth.currentUser, recaptchaVerifier]);

  const handleSendCode = async () => {
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
      toast({ variant: 'default', title: 'Code Sent', description: 'Check your SMS messages.' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnroll = async () => {
    if (!auth.currentUser || !verificationCode || !code) return;
    setIsLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationCode, code);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'My Phone');
      setIsMfaActive(true);
      setVerificationId(null);
      setCode('');
      toast({ variant: 'success', title: 'MFA Enabled', description: 'Your account is now more secure.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verification Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!auth.currentUser || !window.confirm('Are you sure you want to disable MFA?')) return;
    setIsLoading(true);
    try {
      const mfaUser = multiFactor(auth.currentUser);
      const factor = mfaUser.enrolledFactors[0];
      await mfaUser.unenroll(factor);
      setIsMfaActive(false);
      toast({ variant: 'default', title: 'MFA Disabled' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>{t('Auth.mfaEnrollTitle')}</CardTitle>
        </div>
        <CardDescription>{t('Auth.mfaEnrollDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMfaActive ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="font-bold text-green-700">{t('Auth.mfaActive')}</p>
            <Button variant="outline" className="text-destructive border-destructive" onClick={handleDisableMfa} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Auth.mfaDisable')}
            </Button>
          </div>
        ) : !verificationCode ? (
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
                <Button onClick={handleSendCode} disabled={isLoading || !phoneNumber}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('Auth.mfaSendCode')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Auth.mfaCodeLabel')}</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="123456" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  disabled={isLoading}
                />
                <Button onClick={handleVerifyAndEnroll} disabled={isLoading || !code}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('Auth.mfaVerifyAndEnroll')}
                </Button>
              </div>
            </div>
            <Button variant="ghost" className="w-full text-xs" onClick={() => setVerificationId(null)}>
              {t('Actions.back')}
            </Button>
          </div>
        )}
        <div id="recaptcha-container"></div>
      </CardContent>
    </Card>
  );
}
