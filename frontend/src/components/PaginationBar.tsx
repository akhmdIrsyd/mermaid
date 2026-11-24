import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  darkMode: boolean;
  compact?: boolean;
  itemLabel?: string;
}

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  darkMode,
  compact = false,
  itemLabel = 'data',
}) => {
  if (totalItems === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(totalItems, safePage * pageSize);

  const btnBase = darkMode
    ? 'border-slate-700/90 bg-slate-900/70 hover:bg-slate-800 text-slate-200 disabled:opacity-35'
    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-35';

  if (compact) {
    if (safeTotalPages <= 1) return null;
    return (
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-[11px] ${
          darkMode
            ? 'border-slate-800 bg-slate-900/60 text-slate-300'
            : 'border-slate-200/80 bg-slate-50/80 text-slate-600'
        }`}
      >
        <span className="font-medium tabular-nums">
          {from}–{to} / {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className={`p-1 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono font-bold text-[10.5px]">
            {safePage}/{safeTotalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= safeTotalPages}
            onClick={() => onPageChange(safePage + 1)}
            className={`p-1 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const visiblePages = getVisiblePages(safePage, safeTotalPages);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border text-xs ${
        darkMode
          ? 'border-slate-800 bg-slate-900/60 text-slate-300'
          : 'border-slate-200/90 bg-slate-50/80 text-slate-600'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Menampilkan <strong className="font-bold">{from}–{to}</strong> dari{' '}
          <strong className="font-bold">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-[11px]">
            <span className="opacity-70">Per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold outline-none cursor-pointer ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          className={`p-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
          title="Halaman pertama"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={`p-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
          title="Sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {visiblePages.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1.5 opacity-50 select-none">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`min-w-[28px] h-7 px-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                item === safePage
                  ? 'border-[#e0095f] bg-[#e0095f] text-white shadow-xs'
                  : btnBase
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={`p-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
          title="Berikutnya"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safeTotalPages)}
          className={`p-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed transition-colors ${btnBase}`}
          title="Halaman terakhir"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
