'use client';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { LoginForm } from '@/components/auth/login-form';
import { useI18n } from '@/firebase/client-provider';
import Image from 'next/image';

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
      <div className="text-center mb-8">
        <Image
          src="/img/logoLarge.png"
          alt="T-Track Logo"
          width={150}
          height={150}
          className="mx-auto mb-4"
        />
        <h1 className="text-5xl font-bold text-white tracking-tight">
          {t('App.appName')}
        </h1>
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
    </div>
  );
}
