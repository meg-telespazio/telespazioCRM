'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import type { Activity, Client, UserProfile, Contact } from '@/lib/types';
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
  router: ReturnType<typeof useRouter>,
  users: UserProfile[] = [],
  contacts: Contact[] = []
): ColumnDef<Activity>[] => {
  const dateLocale = locale === 'es' ? es : enUS;

  return [
    {
      accessorKey: 'clientId',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Dashboard.recentActivities.clientHeader')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => {
        const clientName = clientMap.get(row.original.clientId) || 'Unknown';
        return <div className="font-medium text-[11px]">{clientName}</div>;
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Table.type')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => <span className="text-[11px]">{t(`Activity.types.${row.original.type}`)}</span>,
    },
    {
      id: 'lastContent',
      header: t('Dashboard.recentActivities.activityHeader'),
      cell: ({ row }) => {
        const activity = row.original;
        const content = activity.latestFollowUpContent || activity.description;
        return <RenderWithMentions text={content} users={users} contacts={contacts} />;
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t('Dashboard.recentActivities.dateHeader')}<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => {
        const date = row.original.updatedAt || row.original.createdAt;
        if (!date) return null;
        return <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}</span>;
      },
    },
    {
      id: 'author',
      header: t('Activity.loggedBy'),
      cell: ({ row }) => {
        const activity = row.original;
        const authorId = activity.latestFollowUpBy || activity.createdBy;
        const author = userMap.get(authorId);
        return <span className="text-[11px]">{author?.displayName || 'System'}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => router.push(`/clients/${row.original.clientId}/activity`)}>
          {t('Activity.view')}
        </Button>
      ),
    },
  ];
};
