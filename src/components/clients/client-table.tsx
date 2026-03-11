
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
import { Search, ListFilter, Download } from 'lucide-react';

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
    cuit: true,
    email: true,
    status: true,
  };

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(defaultVisibility);
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
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Barra de Herramientas */}
      <div className="flex items-center gap-4 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por ID, nombre, email o tax ID..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-primary focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
            <ListFilter className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border-t border-slate-100">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-destructive h-12 first:rounded-tl-none last:rounded-tr-none">
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="h-14 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
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
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-slate-400 italic"
                >
                  {t('Table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="border-t border-slate-100 bg-white">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
