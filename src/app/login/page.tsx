'use client';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { LoginForm } from '@/components/auth/login-form';
import { useI18n } from '@/firebase/client-provider';
import Image from 'next/image';

const APP_VERSION = '2.7.4';

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
      <div className="text-center mb-6 flex flex-col items-center">
        <Image
          src="/img/logoLarge.png"
          alt="T-Track Logo"
          width={140}
          height={140}
          priority
          className="mb-6 drop-shadow-xl"
          style={{ height: 'auto', objectFit: 'contain' }}
        />
        <Image
          src="/img/logoBlancoChico.png"
          alt="Telespazio Logo"
          width={160}
          height={40}
          priority
          className="opacity-90"
          style={{ height: 'auto', objectFit: 'contain' }}
        />
      </div>
      <AuthFormCard
        title={t('Auth.loginTitle')}
        description={t('Auth.loginDescription')}
        footerText={t('Auth.toRegisterPrompt')}
        footerLink="/register"
        footerLinkText={t('Auth.toRegisterLink')}
      >
        <LoginForm />
      </AuthFormCard>

      <div className="mt-8 text-center space-y-1 opacity-70">
        <p className="text-white text-[10px] font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Todos los derechos reservados
        </p>
        <p className="text-white text-[10px] font-medium uppercase">
          Telespazio Argentina S.A. - T-track Sales version: {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
