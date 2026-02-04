'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Opportunity } from '@/lib/types';
import { clients } from '@/lib/data';

const getClientName = (clientId: string) => {
  return clients.find((c) => c.id === clientId)?.name || 'N/A';
};

const stageVariant: { [key in Opportunity['stage']]: "default" | "secondary" | "destructive" } = {
  Prospecting: "secondary",
  Proposal: "secondary",
  Negotiation: "secondary",
  Won: "default",
  Lost: "destructive",
};

export const columns: ColumnDef<Opportunity>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'clientId',
    header: 'Client',
    cell: ({ row }) => getClientName(row.original.clientId),
  },
  {
    accessorKey: 'value',
    header: 'Value (USD)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('value'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => (
      <Badge variant={stageVariant[row.original.stage]}>{row.original.stage}</Badge>
    ),
  },
  {
    accessorKey: 'probability',
    header: 'Probability',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.original.probability} className="w-24" />
        <span>{row.original.probability}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'closeDate',
    header: 'Est. Close Date',
    cell: ({ row }) => (
      <div>{row.original.closeDate.toLocaleDateString()}</div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const opportunity = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(opportunity.id)}
            >
              Copy opportunity ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit opportunity</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete opportunity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
