'use client';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { RegisterForm } from '@/components/auth/register-form';
import { useI18n } from '@/firebase/client-provider';
import Image from 'next/image';

const APP_VERSION = '2.8.0';

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/img/acizer-logo-white.png"
          alt="Acizer Logo"
          width={220}
          height={90}
          priority
          className="drop-shadow-xl"
          style={{ height: 'auto', objectFit: 'contain' }}
        />
        <p className="mt-3 text-blue-200/80 text-[11px] font-semibold uppercase tracking-[0.25em]">
          Sales Management System
        </p>
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

      <div className="mt-8 text-center space-y-1 opacity-70">
        <p className="text-white text-[10px] font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Todos los derechos reservados
        </p>
        <p className="text-white text-[10px] font-medium uppercase tracking-wider">
          Acizer S.A. (www.acizer.com) - T-track Sales version: {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
