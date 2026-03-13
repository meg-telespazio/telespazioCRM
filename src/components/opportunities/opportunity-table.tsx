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
import type { Opportunity, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { useUser, useFirestore } from '@/firebase';
import { DataTablePagination } from '../ui/data-table-pagination';
import { Search, ListFilter, Download } from 'lucide-react';

type OpportunityTableProps = {
  data: Opportunity[];
  clients: Client[];
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
};

export function OpportunityTable({
  data,
  clients,
  onEdit,
  onDelete,
}: OpportunityTableProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const tableId = 'opportunities';

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

  const tableColumns = React.useMemo(
    () => columns(t, clients, onEdit, onDelete),
    [t, clients, onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
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
      const client = clients.find(c => c.id === row.original.clientId);
      return {
        ID: row.original.publicId,
        Proyecto: row.original.title,
        Cliente: client?.name || 'N/A',
        Valor: row.original.value,
        Moneda: row.original.currency,
        Etapa: t(`Stages.${row.original.stage}`),
        Probabilidad: `${row.original.probability}%`,
        'Cierre Est.': row.original.closeDate ? new Date(row.original.closeDate).toLocaleDateString() : '-',
      };
    });
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `oportunidades-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const getColumnLabel = (id: string) => {
    switch (id) {
      case 'publicId': return 'ID Negocio';
      case 'title': return 'Título';
      case 'clientId': return 'Cliente';
      case 'value': return 'Valor';
      case 'stage': return 'Etapa';
      default: return id;
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-3 bg-slate-50/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t('Table.filterByTitle')}
            value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('title')?.setFilterValue(event.target.value)
            }
            className="pl-10 h-10 bg-white border-slate-200 rounded-lg focus-visible:ring-primary focus-visible:ring-offset-0 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
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
                  <TableHead key={header.id} className="bg-destructive h-10">
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
                    <TableCell key={cell.id} className="py-1">
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