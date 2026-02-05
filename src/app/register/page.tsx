'use client';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { RegisterForm } from '@/components/auth/register-form';
import { useI18n } from '@/firebase/client-provider';

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white tracking-tight">{t('App.appName')}</h1>
      </div>
      <AuthFormCard
        title={t('Auth.registerTitle')}
        description={t('Auth.registerDescription')}
        footerText={t('Auth.toLoginPrompt')}
        footerLink="/login"
        footerLinkText={t('Auth.toLoginLink')}
      >
        <RegisterForm />
      </AuthFormCard>
    </div>
  );
}
