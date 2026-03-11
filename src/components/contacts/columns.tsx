'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Mail,
  Phone,
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
import Link from 'next/link';

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
      <div className="flex justify-center px-2">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-white data-[state=checked]:bg-white data-[state=checked]:text-destructive"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center px-2">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'publicId',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        ID CONTACTO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-[9px] font-bold text-blue-700">
            CT
          </div>
          <Link 
            href={`/contacts/${contact.id}`} 
            className="font-mono text-[11px] font-bold text-slate-600 hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            {contact.publicId}
          </Link>
        </div>
      );
    }
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        NOMBRE COMPLETO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-bold text-slate-700 text-[11px]">
        {row.original.name}
      </span>
    )
  },
  {
    accessorKey: 'clientId',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        CLIENTE
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-slate-600 text-[11px]">{getClientName(row.original.clientId, clients)}</span>,
  },
  {
    id: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        EMAIL
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
        const email = row.original.emails?.[0]?.address;
        if (!email) return '-';
        return (
          <a href={`mailto:${email}`} className="text-primary hover:underline text-[11px]">
            {email}
          </a>
        );
    },
  },
  {
    id: 'phone',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        TELÉFONO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-[11px]">{row.original.phones?.[0]?.number || '-'}</span>,
  },
  {
    id: 'actions',
    header: () => (
      <div className="text-white font-bold text-[10px] uppercase tracking-wider text-center px-4">
        ACCIONES
      </div>
    ),
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-100">
                <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[10px]">{t('Actions.title')}</DropdownMenuLabel>
              <DropdownMenuItem className="text-[11px]" onClick={() => onEdit(contact)}>
                <MoreHorizontal className="mr-2 h-3.5 w-3.5" />
                <span>{t('Actions.editContact')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-[11px]"
                onClick={() => onDelete(contact.id)}
              >
                {t('Actions.deleteContact')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];