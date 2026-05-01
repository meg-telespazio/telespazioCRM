'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText, MoreVertical, Trash2, Edit, Bot, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { deleteReport } from '@/lib/firestore/reports';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ReportsPage() {
  const { user, loading: userLoading } = useUser();
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const firestore = useFirestore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const reportsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/reports`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: reports, loading: reportsLoading } = useCollection<Report>(reportsQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
  }, [user, userLoading]);

  const handleDelete = (reportId: string) => {
    if (!user || !window.confirm(t('Actions.confirmDelete'))) return;
    deleteReport(firestore, user.uid, reportId);
  };

  const isLoading = userLoading || reportsLoading;

  if (!mounted) return null;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.reports')}>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push('/reports/ai')}>
            <Sparkles className="h-4 w-4 sm:mr-2 text-primary" />
            <span className="hidden sm:inline">T-Track AI</span>
          </Button>
          <Button size="sm" onClick={() => router.push('/reports/builder/new')}>
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('Reports.createNew')}</span>
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5 overflow-hidden">
                    <CardTitle className="truncate">{report.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      {report.description || t('Reports.noDescription')}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">{t('Actions.title')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/reports/builder/${report.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>{t('Actions.editReport')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(report.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{t('Actions.deleteReport')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full" onClick={() => router.push(`/reports/builder/${report.id}?run=true`)}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('Reports.runReport')}
                  </Button>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 pt-4">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      {format(new Date(report.createdAt), 'PPP', { locale: dateLocale })}
                    </p>
                    <Bot className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
            <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">{t('Reports.noReportsTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{t('Reports.noReportsDescription')}</p>
            <div className="flex items-center gap-2 mt-6">
              <Button onClick={() => router.push('/reports/builder/new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('Reports.createNew')}
              </Button>
              <Button variant="outline" onClick={() => router.push('/reports/ai')}>
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                Probar T-Track AI
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
