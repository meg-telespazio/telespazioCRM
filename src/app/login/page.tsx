'use client';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { LoginForm } from '@/components/auth/login-form';
import { useI18n } from '@/firebase/client-provider';
import Image from 'next/image';

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
      <div className="text-center mb-8 flex flex-col items-center">
        {/* Logo corporativo arriba */}
        <Image
          src="/img/logoLarge.png"
          alt="Telespazio Logo"
          width={220}
          height={60}
          priority
          className="mb-4"
          style={{ height: 'auto', objectFit: 'contain' }}
        />
        {/* Nombre de la app en el medio */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
          {t('App.appName')}
        </h1>
        {/* Logo de la app abajo */}
        <Image
          src="/img/logoRojoLargo.png"
          alt="T-Track Logo"
          width={180}
          height={60}
          priority
          className="opacity-95"
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
    </div>
  );
}
