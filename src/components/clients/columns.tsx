
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  Activity as ActivityIcon,
  MapPin,
  FileText,
  UserPlus,
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
import type { Client, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const statusClasses: { [key in Client['status']]: string } = {
  active: 'bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 font-bold text-[9px]',
  suspended: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none px-2 py-0 font-bold text-[9px]',
  canceled: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-2 py-0 font-bold text-[9px]',
};

const typeClasses: { [key in Client['type']]: string } = {
  client: 'bg-blue-100 text-blue-700 border-none px-2 py-0 font-bold text-[9px]',
  prospect: 'bg-orange-100 text-orange-700 border-none px-2 py-0 font-bold text-[9px]',
};

const formatCuit = (cuit: string): string => {
  if (!cuit || cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

export const columns = (
  t: (key: string, params?: any) => string,
  onEdit: (client: Client) => void,
  onDelete: (clientId: string) => void,
  router: ReturnType<typeof useRouter>,
  users: UserProfile[]
): ColumnDef<Client>[] => {
  
  return [
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
      meta: { className: "hidden sm:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
        >
          ID CLIENTE
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const client = row.original;
        const initials = client.name
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-100 text-[9px] font-bold text-red-700">
              {initials}
            </div>
            <Link 
              href={`/clients/${client.id}/summary`} 
              className="font-mono text-[11px] font-bold text-slate-600 hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              {client.publicId}
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
          NOMBRE DEL CLIENTE
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link 
          href={`/clients/${row.original.id}/summary`} 
          className="font-bold text-slate-700 hover:text-primary transition-colors truncate block max-w-[180px] sm:max-w-[300px] text-[11px]"
        >
          {row.original.name}
        </Link>
      )
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
        >
          TIPO
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("rounded-full", typeClasses[row.original.type || 'client'])}>
          {t(`ClientType.${row.original.type || 'client'}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
        >
          ESTADO
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("rounded-full", statusClasses[row.original.status])}>
          {t(`Status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'assignedTo',
      meta: { className: "hidden md:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
        >
          RESPONSABLE
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const assignedUser = users.find(u => u.uid === row.original.assignedTo);
        return <span className="text-[11px] font-medium text-slate-600">{assignedUser?.displayName || 'Desconocido'}</span>;
      },
    },
    {
      id: 'actions',
      header: () => (
        <div className="text-white font-bold text-[10px] uppercase tracking-wider text-center px-4">
          ACCIONES
        </div>
      ),
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-100">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[10px]">{t('Actions.title')}</DropdownMenuLabel>
                <DropdownMenuItem className="text-[11px]" onClick={() => router.push(`/clients/${client.id}/summary`)}>
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  <span>{t('Actions.viewSummary')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]" onClick={() => onEdit(client)}>
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  <span>{t('Actions.editClient')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]" onClick={() => router.push(`/contacts/new?clientId=${client.id}`)}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  <span>{t('Pages.addContact')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]" onClick={() => router.push(`/clients/${client.id}/activity`)}>
                  <ActivityIcon className="mr-2 h-3.5 w-3.5" />
                  <span>{t('Activity.view')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]" onClick={() => router.push(`/clients/${client.id}/locations`)}>
                  <MapPin className="mr-2 h-3.5 w-3.5" />
                  <span>{t('Locations.view')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-[11px]"
                  onClick={() => onDelete(client.id)}
                >
                  {t('Actions.deleteClient')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
};
