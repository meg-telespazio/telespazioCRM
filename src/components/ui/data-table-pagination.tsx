'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/firebase/client-provider';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { t } = useI18n();

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    const pages = new Set<number>();
    pages.add(0);
    pages.add(pageCount - 1);

    for (let i = -1; i <= 1; i++) {
      const p = pageIndex + i;
      if (p >= 0 && p < pageCount) {
        pages.add(p);
      }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    const finalPages: (number | string)[] = [];
    let lastPage: number | null = null;
    for (const page of sortedPages) {
      if (lastPage !== null && page - lastPage > 1) {
        finalPages.push('...');
      }
      finalPages.push(page);
      lastPage = page;
    }
    return finalPages;
  }, [pageCount, pageIndex]);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-2 py-3 sm:flex-row sm:px-4 sm:py-4">
      {/* Selector de filas por página e info en mobile */}
      <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:space-x-2">
        <div className="flex items-center space-x-2">
          <p className="hidden text-xs font-medium sm:block sm:text-sm">
            {t('Table.pagination.rowsPerPage')}
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[65px]">
              <SelectValue
                placeholder={table.getState().pagination.pageSize}
              />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter sm:hidden">
          {t('Table.pagination.pageInfo', {
            page: pageCount > 0 ? pageIndex + 1 : 0,
            totalPages: pageCount,
          })}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">{t('Table.previous')}</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {pageNumbers.map((page, index) =>
          page === '...' ? (
            <span key={index} className="hidden px-1 text-xs sm:inline sm:text-sm">
              ...
            </span>
          ) : (
            <Button
              key={index}
              variant={pageIndex === page ? 'default' : 'outline'}
              className={cn(
                "h-8 w-8 p-0 text-xs sm:text-sm",
                // En móviles mostramos solo la actual, primera y última si hay muchas para ahorrar espacio
                page !== pageIndex && page !== 0 && page !== pageCount - 1 ? "hidden sm:flex" : ""
              )}
              onClick={() => table.setPageIndex(page as number)}
            >
              {(page as number) + 1}
            </Button>
          )
        )}
        
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">{t('Table.next')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Info de página en desktop */}
      <div className="hidden text-sm text-muted-foreground sm:block">
        {t('Table.pagination.pageInfo', {
          page: pageCount > 0 ? pageIndex + 1 : 0,
          totalPages: pageCount,
        })}
      </div>
    </div>
  );
}
