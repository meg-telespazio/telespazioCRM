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
        {/* Nuevo logo de la app arriba */}
        <Image
          src="/img/logoSmall.png"
          alt="App Logo"
          width={80}
          height={80}
          priority
          className="mb-2"
          style={{ height: 'auto', objectFit: 'contain' }}
        />
        {/* Nombre de la app en el medio */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
          {t('App.appName')}
        </h1>
        {/* Logo corporativo marcado abajo del texto */}
        <Image
          src="/img/logoLarge.png"
          alt="Telespazio Logo"
          width={200}
          height={60}
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
    </div>
  );
}
