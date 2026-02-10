'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  Activity as ActivityIcon,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const statusClasses: { [key in Client['status']]: string } = {
  active: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
  suspended:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200',
  canceled: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300',
};

const formatCuit = (cuit: string): string => {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

export const columns = (
  t: (key: string) => string,
  onEdit: (client: Client) => void,
  onDelete: (clientId: string) => void
): ColumnDef<Client>[] => {
  const router = useRouter();
  
  return [
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
      accessorKey: 'publicId',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Table.clientId')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Forms.clientName')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
    },
    {
      accessorKey: 'cuit',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Forms.cuit')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      cell: ({ row }) => formatCuit(row.original.cuit),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Forms.clientEmail')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      cell: ({ row }) => {
        const email = row.original.email;
        return (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        );
      },
      meta: {
        className: 'hidden lg:table-cell',
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Forms.clientPhone')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      meta: {
        className: 'hidden sm:table-cell',
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Table.status')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(statusClasses[row.original.status])}
        >
          {t(`Status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'industry',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Table.industry')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      cell: ({ row }) => t(`Industries.${row.original.industry}`),
      meta: {
        className: 'hidden md:table-cell',
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
          >
            {t('Table.createdDate')}
            <div className="ml-auto">
              {isSorted === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        );
      },
      cell: ({ row }) => {
        const { createdAt } = row.original;
        return createdAt instanceof Date ? format(createdAt, 'PPP') : '...';
      },
      meta: {
        className: 'hidden lg:table-cell',
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
              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}/activity`)}>
                <ActivityIcon className="mr-2 h-4 w-4" />
                <span>{t('Activity.view')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client)}>
                {t('Actions.editClient')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(client.id)}
              >
                {t('Actions.copyClientId')}
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
};
