'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
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
import type { Location } from '@/lib/types';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

const statusClasses: { [key in Location['status']]: string } = {
  active: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
  suspended:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200',
};

export const columns = (
  t: (key: string) => void,
  onEdit: (location: Location) => void,
  onDelete: (locationId: string) => void
): ColumnDef<Location>[] => [
  {
    id: 'select',
    header: ({ table }) => {
      const { user } = useUser();
      const isIngeniero = user?.role === 'ingeniero';
      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={isIngeniero}
        />
      );
    },
    cell: ({ row }) => {
      const { user } = useUser();
      const isIngeniero = user?.role === 'ingeniero';
      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={isIngeniero}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Locations.name')}
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
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Locations.type')}
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
    cell: ({ row }) => t(`LocationTypes.${row.original.type}`),
  },
  {
    id: 'address',
    header: t('Table.address'),
    cell: ({ row }) => `${row.original.streetName} ${row.original.streetNumber}, ${row.original.city}`,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full h-full text-left justify-start p-2 sm:p-4 hover:bg-red-700 hover:text-white"
        >
          {t('Locations.status')}
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
    id: 'actions',
    cell: function ActionCell({ row }) {
      const location = row.original;
      const { user } = useUser();
      const isIngeniero = user?.role === 'ingeniero';

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
            <DropdownMenuItem onClick={() => onEdit(location)}>
              {isIngeniero ? <Eye className="mr-2 h-4 w-4" /> : null}
              {isIngeniero ? t('Activity.view') : t('Actions.editLocation')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(location.id)}
            >
              {t('Actions.copyLocationId')}
            </DropdownMenuItem>
            {!isIngeniero && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(location.id)}
                >
                  {t('Actions.deleteLocation')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];