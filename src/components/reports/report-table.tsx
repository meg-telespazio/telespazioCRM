'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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
import { useI18n } from '@/firebase/client-provider';
import { format } from 'date-fns';
import { DataTablePagination } from '../ui/data-table-pagination';

type ReportTableProps = {
  columns: ColumnDef<any>[];
  data: any[];
};

const formatCell = (value: any): string => {
    if (value instanceof Date) {
        return format(value, 'P');
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        if(typeof value[0] === 'object' && value[0] !== null) {
             return value.map(item => item.address || item.number || JSON.stringify(item)).join(', ');
        }
        return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    if(typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
        return value.toLocaleString();
    }
    return String(value ?? '-');
}


export function ReportTable({ columns, data }: ReportTableProps) {
  const { t } = useI18n();

  const tableColumns = React.useMemo<ColumnDef<any>[]>(() => 
    columns.map(col => ({
        ...col,
        cell: (props) => formatCell(props.getValue())
    })), [columns]);


  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full bg-card rounded-lg border shadow-sm">
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
                  colSpan={tableColumns.length}
                  className="h-24 text-center"
                >
                  {t('Reports.noResults')}
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
