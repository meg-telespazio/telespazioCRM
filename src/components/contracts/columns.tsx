
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  ShoppingCart,
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
import type { Contract, Client, ContractStatus } from '@/lib/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const getClientName = (clientId: string, clients: Client[]) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

const statusVariant: {
  [key in ContractStatus]: 'default' | 'secondary' | 'destructive';
} = {
  activo: 'default',
  vencido: 'destructive',
  renovado: 'secondary',
  'renovado automatico': 'secondary',
};

export const columns = (
  t: (key: string) => string,
  clients: Client[],
  onEdit: (contract: Contract) => void,
  onDelete: (contractId: string) => void,
  router: ReturnType<typeof useRouter>
): ColumnDef<Contract>[] => [
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('Table.contractId')}
        {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
  },
  {
    accessorKey: 'clientId',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('Dashboard.recentOpportunities.clientHeader')}
        {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => getClientName(row.original.clientId, clients),
    filterFn: (row, id, value) => {
      const clientName = getClientName(row.getValue(id), clients);
      return clientName.toLowerCase().includes(value.toLowerCase());
    }
  },
  {
    accessorKey: 'type',
    header: t('Table.type'),
    cell: ({ row }) => t(`ContractTypes.${row.original.type}`),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('Contracts.amount')}
        {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: row.original.currency,
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: t('Table.status'),
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {t(`ContractStatuses.${row.original.status}`)}
      </Badge>
    ),
  },
   {
    accessorKey: 'startDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('Contracts.startDate')}
        {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => <div>{format(row.original.startDate, 'PPP')}</div>,
  },
  {
    accessorKey: 'endDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {t('Contracts.endDate')}
        {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
      </Button>
    ),
    cell: ({ row }) => <div>{format(row.original.endDate, 'PPP')}</div>,
  },
   {
    accessorKey: 'durationMonths',
    header: t('Contracts.durationMonths'),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const contract = row.original;
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
            <DropdownMenuItem onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>{t('Actions.addPO')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(contract)}>
              {t('Actions.editContract')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(contract.id)}
            >
              {t('Actions.copyContractId')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(contract.id)}
            >
              {t('Actions.deleteContract')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
