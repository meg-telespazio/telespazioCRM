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
    if (pageCount <= 7) {
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
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">
          {t('Table.pagination.rowsPerPage')}
        </p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
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
      <div className="flex items-center space-x-2">
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
            <span key={index} className="px-1 text-sm">
              ...
            </span>
          ) : (
            <Button
              key={index}
              variant={pageIndex === page ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
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
      <div className="text-sm text-muted-foreground">
        {t('Table.pagination.pageInfo', {
          page: pageCount > 0 ? pageIndex + 1 : 0,
          totalPages: pageCount,
        })}
      </div>
    </div>
  );
}
