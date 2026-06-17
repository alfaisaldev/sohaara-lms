'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ current, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-secondary-text">
        Showing <span className="text-white font-medium">{Math.min((current - 1) * pageSize + 1, total)}</span> to{' '}
        <span className="text-white font-medium">{Math.min(current * pageSize, total)}</span> of{' '}
        <span className="text-white font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="h-8 px-2 flex items-center text-secondary-text text-sm">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onChange(page)}
              className={`h-8 min-w-[2rem] px-2 rounded-lg text-sm font-medium transition-all ${
                page === current
                  ? 'bg-accent-indigo text-white shadow-md'
                  : 'text-secondary-text hover:text-white hover:bg-white/5'
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current >= totalPages}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
