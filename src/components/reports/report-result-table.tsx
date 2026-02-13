'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
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
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type ReportResultTableProps = {
  columns: { accessorKey: string, header: string }[];
  data: any[];
};

const ReportResultTable = ({ columns, data }: ReportResultTableProps) => {
  const { t } = useI18n();

  const formatCellForDisplay = (value: any): string => {
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
          return value ? t('Yes') : t('No');
      }
      if (typeof value === 'number') {
          return value.toLocaleString();
      }
      return String(value ?? '-');
  }

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const tableColumns = React.useMemo<ColumnDef<any>[]>(() => 
    columns.map(col => ({
        accessorKey: col.accessorKey,
        header: col.header,
        cell: (props) => formatCellForDisplay(getNestedValue(props.row.original, col.accessorKey)),
        enableSorting: true,
    })), [columns, t]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  
  const getNestedValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((p, c) => (p && p[c]), obj);
  }

  const formatCellForExport = (value: any): string => {
    if (value instanceof Date) return format(value, 'yyyy-MM-dd');
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      if (typeof value[0] === 'object' && value[0] !== null) {
        return value
          .map((item) => item.address || item.number || JSON.stringify(item))
          .join('; ');
      }
      return value.join('; ');
    }
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? t('Yes') : t('No');
    if (typeof value === 'number') return value.toString();
    return String(value ?? '');
  };


  const handleDownload = () => {
    const headers = columns.map(col => col.header);
    const dataForCsv = data.map(row => 
        columns.map(col => formatCellForExport(getNestedValue(row, col.accessorKey)))
    );
    const csv = Papa.unparse([headers, ...dataForCsv]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('Reports.results')}</CardTitle>
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('Reports.downloadCsv')}
            </Button>
          </CardHeader>
      <CardContent>
        <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
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
      </div>
      <DataTablePagination table={table} />
      </CardContent>
    </Card>
  );
}

export { ReportResultTable };
