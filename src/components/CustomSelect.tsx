'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export default function CustomSelect({ value, options, onChange, className = '' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number>(0);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && triggerRef.current) {
      setDropdownWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 px-3 rounded-lg text-sm border flex items-center gap-1.5 cursor-pointer transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: open ? 'var(--accent)' : 'var(--border-color)',
          color: 'var(--text-primary)',
          minWidth: '100px',
        }}
      >
        <span className="flex-1 text-left truncate">{selected?.label || '选择'}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg border shadow-lg py-1 z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            width: dropdownWidth || 'auto',
          }}
        >
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full px-3 py-1.5 text-sm text-left transition-colors"
              style={{
                color: opt.value === value ? 'var(--accent)' : 'var(--text-primary)',
                backgroundColor: opt.value === value ? 'var(--accent-light)' : 'transparent',
                borderRadius: idx === 0 ? '0' : idx === options.length - 1 ? '0' : '0',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
