// @ts-nocheck
'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        上一页
      </button>

      {getPages().map((page, idx) =>
        typeof page === 'number' ? (
          <button
            key={idx}
            onClick={() => onPageChange(page)}
            className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: page === currentPage ? 'var(--accent)' : 'var(--bg-card)',
              color: page === currentPage ? 'white' : 'var(--text-secondary)',
              border: page === currentPage ? 'none' : '1px solid var(--border-color)',
            }}
          >
            {page}
          </button>
        ) : (
          <span key={idx} className="px-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {page}
          </span>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        下一页
      </button>
    </div>
  );
}
