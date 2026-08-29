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
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="分页导航">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 sm:min-h-8"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-card)',
        }}
        aria-label="上一页"
      >
        上一页
      </button>

      {getPages().map((page, idx) =>
        typeof page === 'number' ? (
          <button
            key={idx}
            onClick={() => onPageChange(page)}
            className="h-11 w-11 rounded-lg text-sm font-medium transition-colors sm:h-8 sm:w-8"
            style={{
              backgroundColor: page === currentPage ? 'var(--accent)' : 'var(--bg-card)',
              color: page === currentPage ? 'white' : 'var(--text-secondary)',
              border: page === currentPage ? 'none' : '1px solid var(--border-color)',
            }}
            aria-label={`第 ${page} 页`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ) : (
          <span key={idx} className="px-1 text-sm text-muted-foreground" >
            {page}
          </span>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 sm:min-h-8"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-card)',
        }}
        aria-label="下一页"
      >
        下一页
      </button>
    </nav>
  );
}
