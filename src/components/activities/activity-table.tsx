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
import { columns } from './columns';
import type { Activity, Client, UserProfile } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { DataTablePagination } from '../ui/data-table-pagination';

type ActivityTableProps = {
  activities: Activity[];
  clientMap: Map<string, string>;
  userMap: Map<string, UserProfile>;
};

export function ActivityTable({ activities, clientMap, userMap }: ActivityTableProps) {
  const { t, locale } = useI18n();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const tableColumns = React.useMemo(
    () => columns(t, locale, clientMap, userMap),
    [t, locale, clientMap, userMap]
  );

  const table = useReactTable({
    data: activities,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full bg-card rounded-lg border shadow-sm">
      <div className="flex items-center p-4">
        <Input
          placeholder={t('Table.filterByName')}
          value={(table.getColumn('clientId')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('clientId')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="border-y">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  colSpan={tableColumns.length}
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
