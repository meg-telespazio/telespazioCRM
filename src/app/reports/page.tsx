'use client';

import { useEffect } from 'react';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { ReportBuilder } from '@/components/reports/report-builder';

export default function ReportsPage() {
  const { user, loading: userLoading } = useUser();
  const { t } = useI18n();

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>{t('App.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.reports')} />
      <main className="flex-1 p-4 sm:p-6">
        <ReportBuilder />
      </main>
    </div>
  );
}
