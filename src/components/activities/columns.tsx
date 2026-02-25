'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import type { Activity, Client, UserProfile } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { RenderWithMentions } from '../activity/render-with-mentions';
import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';

export const columns = (
  t: (key: string, params?: any) => string,
  locale: string,
  clientMap: Map<string, string>,
  userMap: Map<string, UserProfile>,
  router: ReturnType<typeof useRouter>
): ColumnDef<Activity>[] => {
  const dateLocale = locale === 'es' ? es : enUS;

  return [
    {
      accessorKey: 'clientId',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Dashboard.recentActivities.clientHeader')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => {
        const clientName = clientMap.get(row.original.clientId) || 'Unknown';
        return <div className="font-medium">{clientName}</div>;
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Activity.type')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => t(`Activity.types.${row.original.type}`),
    },
    {
      id: 'lastContent',
      header: t('Dashboard.recentActivities.activityHeader'),
      cell: ({ row }) => {
        const activity = row.original;
        const content = activity.latestFollowUpContent || activity.description;
        return <RenderWithMentions text={content} />;
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Dashboard.recentActivities.dateHeader')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => {
        const date = row.original.updatedAt || row.original.createdAt;
        if (!date) return null;
        return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
      },
    },
    {
      id: 'author',
      header: t('Activity.loggedBy'),
      cell: ({ row }) => {
        const activity = row.original;
        const authorId = activity.latestFollowUpBy || activity.createdBy;
        const author = userMap.get(authorId);
        return author?.displayName || 'System';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => router.push(`/clients/${row.original.clientId}/activity`)}>
          {t('Activity.view')}
        </Button>
      ),
    },
  ];
};
