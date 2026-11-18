import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const pages = Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Страницы каталога"
      className="flex flex-wrap items-center gap-2.5 sm:gap-3 md:gap-[0.85vw] mt-4 md:mt-[1.2vw] pl-1 sm:pl-2"
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
        aria-label="Предыдущая страница"
        className="w-[42px] h-[42px] md:w-[clamp(30px,2.75vw,46px)] md:h-[clamp(30px,2.75vw,46px)] rounded-full bg-white/95 border border-white shadow-[0_4px_14px_rgba(235,165,205,0.38)] flex items-center justify-center text-[#701142] cursor-pointer disabled:opacity-60"
      >
        <ChevronLeft className="w-[17px] h-[17px] md:w-[clamp(12px,1.1vw,18px)] md:h-[clamp(12px,1.1vw,18px)] stroke-[2.4]" />
      </button>

      {pages.map((page) => {
        const active = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange?.(page)}
            aria-current={active ? 'page' : undefined}
            className="w-[42px] h-[42px] md:w-[clamp(30px,2.75vw,46px)] md:h-[clamp(30px,2.75vw,46px)] rounded-full text-[15px] md:text-[clamp(11px,0.95vw,16px)] font-semibold text-[#701142] flex items-center justify-center cursor-pointer tabular-nums"
            style={
              active
                ? {
                    background: 'linear-gradient(180deg, #FFE4F5 0%, #FACCE9 100%)',
                    boxShadow:
                      '0 4px 14px rgba(235,165,205,0.42), inset 0 1px 2px rgba(255,255,255,0.75)',
                  }
                : {
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 4px 14px rgba(235,165,205,0.32)',
                  }
            }
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
        aria-label="Следующая страница"
        className="w-[42px] h-[42px] md:w-[clamp(30px,2.75vw,46px)] md:h-[clamp(30px,2.75vw,46px)] rounded-full bg-white/95 border border-white shadow-[0_4px_14px_rgba(235,165,205,0.38)] flex items-center justify-center text-[#701142] cursor-pointer disabled:opacity-60"
      >
        <ChevronRight className="w-[17px] h-[17px] md:w-[clamp(12px,1.1vw,18px)] md:h-[clamp(12px,1.1vw,18px)] stroke-[2.4]" />
      </button>
    </nav>
  );
};
