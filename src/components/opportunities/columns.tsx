'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
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
import { Badge } from '@/components/ui/badge';
import type { Opportunity, Client } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const getClientName = (clientId: string, clients: Client[]) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

const stageClasses: { [key in Opportunity['stage']]: string } = {
  Prospecting: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none px-2 py-0 font-bold text-[9px]',
  Proposal: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0 font-bold text-[9px]',
  Negotiation: 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-2 py-0 font-bold text-[9px]',
  Won: 'bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 font-bold text-[9px]',
  Lost: 'bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0 font-bold text-[9px]',
  Canceled: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-2 py-0 font-bold text-[9px]',
  Suspended: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-2 py-0 font-bold text-[9px]',
};

export const columns = (
  t: (key: string) => string,
  clients: Client[],
  onEdit: (opportunity: Opportunity) => void,
  onDelete: (opportunityId: string) => void
): ColumnDef<Opportunity>[] => [
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
        ID NEGOCIO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const opp = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-100 text-[9px] font-bold text-amber-700">
            OP
          </div>
          <Link 
            href={`/opportunities/${opp.id}`} 
            className="font-mono text-[11px] font-bold text-slate-600 hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            {opp.publicId}
          </Link>
        </div>
      );
    }
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        TÍTULO DEL PROYECTO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-bold text-slate-700 text-[11px] truncate block max-w-[200px]">
        {row.original.title}
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
    cell: ({ row }) => <span className="text-slate-600 text-[11px] truncate block max-w-[150px]">{getClientName(row.original.clientId, clients)}</span>,
  },
  {
    accessorKey: 'value',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        VALOR (USD)
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('value'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="font-bold text-slate-700 text-[11px]">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stage',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        ETAPA
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className={cn("rounded-full", stageClasses[row.original.stage])}>
        {t(`Stages.${row.original.stage}`)}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: () => (
      <div className="text-white font-bold text-[10px] uppercase tracking-wider text-center px-4">
        ACCIONES
      </div>
    ),
    cell: ({ row }) => {
      const opportunity = row.original;
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
              <DropdownMenuItem className="text-[11px]" onClick={() => onEdit(opportunity)}>
                <MoreHorizontal className="mr-2 h-3.5 w-3.5" />
                <span>{t('Actions.editOpportunity')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-[11px]"
                onClick={() => onDelete(opportunity.id)}
              >
                {t('Actions.deleteOpportunity')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];