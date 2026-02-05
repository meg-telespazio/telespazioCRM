'use client';

import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useI18n } from '@/firebase/client-provider';

export default function Home() {
  const { user, loading } = useUser();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading) {
      if (user) {
        redirect('/dashboard');
      } else {
        redirect('/login');
      }
    }
  }, [user, loading]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <p>{t('App.loading')}</p>
    </div>
  );
}
