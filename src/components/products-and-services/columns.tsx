'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  Package,
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
import type { ProductOrService } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const statusClasses: { [key in ProductOrService['status']]: string } = {
  active: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
  inactive: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300',
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const columns = (
  t: (key: string) => string,
  onEdit: (item: ProductOrService) => void,
  onDelete: (itemId: string) => void
): ColumnDef<ProductOrService>[] => [
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
    id: 'photo',
    header: () => null,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={item.photoURL} alt={item.name} />
          <AvatarFallback className="rounded-md">
            <Package className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      );
    },
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
          {t('Table.itemId')}
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
          {t('PS.itemName')}
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
    accessorKey: 'type',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Table.type')}
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
    cell: ({ row }) => t(`PS.${row.original.type}`),
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
    accessorKey: 'oneTimeCharge',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Table.oneTimeCharge')}
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
      const { oneTimeCharge, currency } = row.original;
      return oneTimeCharge ? formatCurrency(oneTimeCharge, currency) : '-';
    },
  },
  {
    accessorKey: 'recurringCharge',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Table.recurringCharge')}
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
      const { recurringCharge, currency } = row.original;
      return recurringCharge ? formatCurrency(recurringCharge, currency) : '-';
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
      const item = row.original;
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
              onClick={() => navigator.clipboard.writeText(item.id)}
            >
              {t('Actions.copyItemId')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(item)}>
              {t('Actions.editItem')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(item.id)}
            >
              {t('Actions.deleteItem')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
