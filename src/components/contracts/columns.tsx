'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  ShoppingCart,
  Eye,
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
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser } from '@/firebase';

const getClientName = (clientId: string, clients: Client[]) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

const statusClasses: { [key in ContractStatus]: string } = {
  activo: 'bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 font-bold text-[9px]',
  vencido: 'bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0 font-bold text-[9px]',
  renovado: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0 font-bold text-[9px]',
  'renovado automatico': 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-2 py-0 font-bold text-[9px]',
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
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        ID CONTRATO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const contract = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-100 text-[9px] font-bold text-purple-700">
            CO
          </div>
          <Link 
            href={`/contracts/${contract.id}`} 
            className="font-mono text-[11px] font-bold text-slate-600 hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            {contract.publicId}
          </Link>
        </div>
      );
    }
  },
  {
    accessorKey: 'clientId',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8 w-full justify-start"
      >
        CLIENTE
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const contract = row.original;
      const clientName = getClientName(contract.clientId, clients);
      return (
        <div className="flex flex-col py-1">
          <span className="text-slate-700 font-bold text-[11px] truncate block max-w-[120px] sm:max-w-[200px]">
            {clientName}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground md:hidden truncate">
            {contract.publicId}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    meta: { className: "hidden lg:table-cell" },
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
    cell: ({ row }) => <span className="text-slate-600 text-[11px]">{t(`ContractTypes.${row.original.type}`)}</span>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        MONTO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: row.original.currency,
      }).format(amount);
      return <div className="font-bold text-slate-700 text-[11px]">{formatted}</div>;
    },
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
        {t(`ContractStatuses.${row.original.status}`)}
      </Badge>
    ),
  },
  {
    accessorKey: 'startDate',
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-white hover:bg-red-800 font-bold text-[10px] uppercase tracking-wider h-8"
      >
        F. INICIO
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-slate-500 text-[11px]">{format(row.original.startDate, 'dd/MM/yyyy')}</div>,
  },
  {
    id: 'actions',
    header: () => (
      <div className="text-white font-bold text-[10px] uppercase tracking-wider text-center px-4">
        ACCIONES
      </div>
    ),
    cell: function ActionCell({ row }) {
      const contract = row.original;
      const { user } = useUser();
      const isIngeniero = user?.role === 'ingeniero';

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
              
              <DropdownMenuItem className="text-[11px]" onClick={() => onEdit(contract)}>
                {isIngeniero ? <Eye className="mr-2 h-3.5 w-3.5" /> : <MoreHorizontal className="mr-2 h-3.5 w-3.5" />}
                <span>{isIngeniero ? t('Activity.view') : t('Actions.editContract')}</span>
              </DropdownMenuItem>

              {!isIngeniero && (
                <>
                  <DropdownMenuItem className="text-[11px]" onClick={() => router.push(`/purchase-orders/new?contractId=${contract.id}`)}>
                    <ShoppingCart className="mr-2 h-3.5 w-3.5" />
                    <span>{t('Actions.addPO')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive text-[11px]"
                    onClick={() => onDelete(contract.id)}
                  >
                    {t('Actions.deleteContract')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];