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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Opportunity, Client } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const getClientName = (clientId: string, clients: Client[]) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

const stageClasses: { [key in Opportunity['stage']]: string } = {
  Prospecting: 'bg-yellow-400 text-black hover:bg-yellow-500 border-transparent',
  Proposal: 'bg-[#000080] text-white hover:bg-[#000066] border-transparent',
  Negotiation: 'bg-[#000080] text-white hover:bg-[#000066] border-transparent',
  Won: 'bg-green-600 text-white hover:bg-green-700 border-transparent',
  Lost: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  Canceled: 'bg-gray-300 text-gray-900 hover:bg-gray-400 border-transparent',
  Suspended: 'bg-gray-300 text-gray-900 hover:bg-gray-400 border-transparent',
};

export const columns = (
  t: (key: string) => void,
  clients: Client[],
  onEdit: (opportunity: Opportunity) => void,
  onDelete: (opportunityId: string) => void
): ColumnDef<Opportunity>[] => [
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
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Table.opportunityId')}
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
    accessorKey: 'title',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Dashboard.recentOpportunities.opportunityHeader')}
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
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Dashboard.recentOpportunities.clientHeader')}
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
    accessorKey: 'value',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Dashboard.recentOpportunities.valueHeader')} (USD)
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
      const amount = parseFloat(row.getValue('value'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stage',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Dashboard.recentOpportunities.stageHeader')}
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
      <Badge className={cn('whitespace-nowrap', stageClasses[row.original.stage])}>
        {t(`Stages.${row.original.stage}`)}
      </Badge>
    ),
  },
  {
    accessorKey: 'probability',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Forms.probability')}
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
      <div className="flex items-center gap-2">
        <Progress value={row.original.probability} className="w-24" />
        <span>{row.original.probability}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'closeDate',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Forms.estCloseDate')}
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
    cell: ({ row }) => <div>{format(row.original.closeDate, 'PPP')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const opportunity = row.original;
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
              onClick={() => navigator.clipboard.writeText(opportunity.id)}
            >
              {t('Actions.copyOpportunityId')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(opportunity)}>
              {t('Actions.editOpportunity')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(opportunity.id)}
            >
              {t('Actions.deleteOpportunity')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
