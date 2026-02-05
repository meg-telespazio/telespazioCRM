'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Client } from '@/lib/types';
import { format } from 'date-fns';

const statusVariant: {
  [key in Client['status']]: 'default' | 'secondary' | 'destructive';
} = {
  active: 'default',
  suspended: 'secondary',
  canceled: 'destructive',
};

export const columns = (
  t: (key: string) => string,
  onEdit: (client: Client) => void,
  onDelete: (clientId: string) => void
): ColumnDef<Client>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: t('Forms.clientName'),
  },
  {
    accessorKey: 'email',
    header: t('Forms.clientEmail'),
  },
  {
    accessorKey: 'phone',
    header: t('Forms.clientPhone'),
  },
  {
    accessorKey: 'status',
    header: t('Table.status'),
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {t(`Status.${row.original.status}`)}
      </Badge>
    ),
  },
  {
    accessorKey: 'industry',
    header: t('Table.industry'),
    cell: ({ row }) => t(`Industries.${row.original.industry}`),
  },
  {
    accessorKey: 'createdAt',
    header: t('Table.createdDate'),
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return createdAt instanceof Date ? format(createdAt, 'PPP') : '...';
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const client = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('Actions.title')}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(client.id)}
            >
              {t('Actions.copyClientId')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(client)}>
              {t('Actions.editClient')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(client.id)}
            >
              {t('Actions.deleteClient')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
