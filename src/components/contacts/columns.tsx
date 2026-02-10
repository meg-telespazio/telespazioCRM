'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
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
import type { Contact, Client } from '@/lib/types';
import { format } from 'date-fns';

const getClientName = (clientId: string, clients: Client[]) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

export const columns = (
  t: (key: string) => string,
  clients: Client[],
  onEdit: (contact: Contact) => void,
  onDelete: (contactId: string) => void
): ColumnDef<Contact>[] => [
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
          {t('Table.contactId')}
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
          {t('Forms.contactName')}
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
    accessorKey: 'clientId',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Pages.clients')}
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
    cell: ({ row }) => getClientName(row.original.clientId, clients),
  },
  {
    id: 'email',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Auth.emailLabel')}
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
        const email = row.original.emails?.[0]?.address;
        if (!email) return '-';
        return (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        );
    },
    meta: {
      className: 'hidden lg:table-cell',
    },
    accessorFn: (row) => row.emails?.[0]?.address,
    enableSorting: true,
  },
  {
    id: 'phone',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Auth.phoneLabel')}
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
    cell: ({ row }) => row.original.phones?.[0]?.number || '-',
    meta: {
      className: 'hidden sm:table-cell',
    },
    accessorFn: (row) => row.phones?.[0]?.number,
    enableSorting: true,
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
      const contact = row.original;
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
              onClick={() => navigator.clipboard.writeText(contact.id)}
            >
              {t('Actions.copyContactId')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              {t('Actions.editContact')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(contact.id)}
            >
              {t('Actions.deleteContact')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
