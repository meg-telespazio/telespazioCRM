'use client';

import * as React from 'react';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { doc, updateDoc } from 'firebase/firestore';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { columns } from './columns';
import type { Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useUser, useFirestore } from '@/firebase';
import { DataTablePagination } from '../ui/data-table-pagination';
import { useRouter } from 'next/navigation';

type ClientTableProps = {
  data: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
};

export function ClientTable({ data, onEdit, onDelete }: ClientTableProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const tableId = 'clients';
  const defaultVisibility = {
    createdAt: false,
    phone: false,
    industry: false,
  };

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultVisibility);
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    const savedVisibility = user?.tablePreferences?.[tableId];
    if (savedVisibility) {
      setColumnVisibility(savedVisibility);
    }
  }, [user, tableId]);

  const handleVisibilityChange = (
    updater: React.SetStateAction<VisibilityState>
  ) => {
    const newVisibility =
      typeof updater === 'function' ? updater(columnVisibility) : updater;
    setColumnVisibility(newVisibility);

    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      updateDoc(userRef, {
        [`tablePreferences.${tableId}`]: newVisibility,
      });
    }
  };

  const table = useReactTable({
    data,
    columns: columns(t, onEdit, onDelete, router),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: handleVisibilityChange,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full bg-card rounded-lg border shadow-sm">
      <div className="flex items-center justify-between p-4">
        <Input
          placeholder={t('Table.filterByName')}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {t('Table.columns')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const translationKey = 
                      column.id === 'createdAt' ? 'Table.createdDate' 
                    : column.id === 'publicId' ? 'Table.clientId'
                    : `Forms.${column.id}`;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {t(translationKey) || column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="border-y">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns(t, onEdit, onDelete, router).length}
                  className="h-24 text-center"
                >
                  {t('Table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
