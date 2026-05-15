'use client';

interface SortDirButtonProps {
  direction: 'asc' | 'desc';
  onToggle: () => void;
}

export default function SortDirButton({ direction, onToggle }: SortDirButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-8 w-8 flex items-center justify-center rounded-lg border cursor-pointer transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
      title={direction === 'desc' ? '降序排列' : '升序排列'}
    >
      {direction === 'desc' ? (
        /* Descending: arrow down with Z-A text */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      ) : (
        /* Ascending: arrow up with A-Z text */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      )}
    </button>
  );
}
