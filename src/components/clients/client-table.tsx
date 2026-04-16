
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
import Papa from 'papaparse';

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { columns } from './columns';
import type { Client, UserProfile } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useUser, useFirestore } from '@/firebase';
import { DataTablePagination } from '../ui/data-table-pagination';
import { useRouter } from 'next/navigation';
import { Search, ListFilter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientBulkEditDialog } from './client-bulk-edit-dialog';

type ClientTableProps = {
  data: Client[];
  users: UserProfile[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
};

export function ClientTable({ data, users, onEdit, onDelete }: ClientTableProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const tableId = 'clients';
  
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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
    columns: columns(t, onEdit, onDelete, router, users),
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

  const handleExport = () => {
    const exportData = table.getFilteredRowModel().rows.map(row => {
      const assignedUser = users.find(u => u.uid === row.original.assignedTo);
      return {
        ID: row.original.publicId,
        Nombre: row.original.name,
        'TAX ID': row.original.cuit,
        Sector: row.original.sector,
        Tipo: t(`ClientType.${row.original.type}`),
        Estado: t(`Status.${row.original.status}`),
        País: row.original.countryHQ ? t(`Countries.${row.original.countryHQ}`) : '-',
        Gerencia: row.original.management,
        Responsable: assignedUser?.displayName || 'Desconocido',
      };
    });
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `clientes-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const getColumnLabel = (id: string) => {
    switch (id) {
      case 'publicId': return 'ID Cliente';
      case 'name': return 'Nombre';
      case 'cuit': return 'TAX ID';
      case 'type': return 'Tipo';
      case 'sector': return 'Sector';
      case 'status': return 'Estado';
      case 'countryHQ': return 'País';
      case 'assignedTo': return 'Responsable';
      default: return id;
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-3 bg-slate-50/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por ID, nombre o tax ID..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="pl-10 h-10 bg-white border-slate-200 rounded-lg focus-visible:ring-primary focus-visible:ring-offset-0 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <ClientBulkEditDialog
            selectedClients={table.getFilteredSelectedRowModel().rows.map(r => r.original)}
            onComplete={() => table.toggleAllRowsSelected(false)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600">
                <ListFilter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Columnas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllColumns().filter(col => col.getCanHide()).map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="text-xs capitalize"
                >
                  {getColumnLabel(column.id)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-slate-400 hover:text-slate-600"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn("bg-destructive h-10", (header.column.columnDef as any).meta?.className)}>
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
                  className="h-10 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("py-1", (cell.column.columnDef as any).meta?.className)}>
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
                  className="h-20 text-center text-slate-400 italic text-xs"
                >
                  {t('Table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-slate-100 bg-white">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
