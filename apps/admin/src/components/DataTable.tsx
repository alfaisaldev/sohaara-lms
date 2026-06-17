'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyIcon,
  emptyMessage = 'No data found',
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="glass-dark-card border-border/50 overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((col) => (
                  <th key={col.key} className="text-left p-4 text-secondary-text font-medium">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  {columns.map((col) => (
                    <td key={col.key} className="p-4">
                      <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-dark-card border-border/50 overflow-hidden animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {emptyIcon || (
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <ChevronsUpDown size={20} className="text-secondary-text/30" />
            </div>
          )}
          <p className="text-secondary-text text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null;
    if (sortKey !== column.key) return <ChevronsUpDown size={12} className="ml-1 opacity-50" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />;
  };

  return (
    <div className="glass-dark-card border-border/50 overflow-hidden animate-fade-in-up">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left p-4 text-secondary-text font-medium ${col.sortable ? 'cursor-pointer hover:text-white transition-colors select-none' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-0.5">
                    {col.label}
                    <SortIcon column={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item[keyField]}
                className={`border-b border-border/30 hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`p-4 ${col.className || ''}`}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
