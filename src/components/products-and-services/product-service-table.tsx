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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { columns } from './columns';
import type { ProductOrService } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { DataTablePagination } from '../ui/data-table-pagination';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateProductOrService } from '@/lib/firestore/products-and-services';

type ProductServiceTableProps = {
  data: ProductOrService[];
  onEdit: (item: ProductOrService) => void;
  onDelete: (itemId: string) => void;
};

export function ProductServiceTable({ data, onEdit, onDelete }: ProductServiceTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
        createdAt: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const { t } = useI18n();
  const firestore = useFirestore();
  const { toast } = useToast();

  const table = useReactTable({
    data,
    columns: columns(t, onEdit, onDelete),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });
  
  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (!selectedRows.length || !window.confirm(t('Actions.confirmBulkUpdate', { count: selectedRows.length, status: t(`Status.${status}`) }))) {
      return;
    }
    
    toast({ title: t('PS.bulkUpdateSaving') });

    const promises = selectedRows.map(row => {
      return updateProductOrService(firestore, row.original.id, { status });
    });

    try {
        await Promise.all(promises);
        toast({ variant: 'success', title: t('PS.bulkUpdateSuccess') });
    } catch (error: any) {
        toast({ variant: 'destructive', title: t('PS.bulkUpdateError'), description: error.message });
    } finally {
        table.resetRowSelection();
    }
  };


  const getColumnName = (key: string) => {
    const map: { [key: string]: string } = {
        publicId: t('Table.itemId'),
        name: t('PS.itemName'),
        type: t('Table.type'),
        status: t('Table.status'),
        oneTimeCharge: t('Table.oneTimeCharge'),
        recurringCharge: t('Table.recurringCharge'),
        currency: t('Table.currency'),
        createdAt: t('Table.createdDate'),
    }
    return map[key] || key;
  }

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
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                          {t('Actions.bulkActions')} ({table.getFilteredSelectedRowModel().rows.length})
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                      <DropdownMenuLabel>{t('Actions.bulkStatusUpdate')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                          {t('Status.active')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                          {t('Status.inactive')}
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          )}
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
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {getColumnName(column.id)}
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
                  colSpan={columns(t, onEdit, onDelete).length}
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
