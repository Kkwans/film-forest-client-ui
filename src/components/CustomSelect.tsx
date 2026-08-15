'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: CustomSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <Select
      value={value || null}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onChange(nextValue);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'min-w-[6.5rem] border-border bg-card px-3 hover:border-[var(--accent)] data-[popup-open]:border-[var(--accent)]',
          className,
        )}
      >
        <SelectValue>{selected?.label ?? '请选择'}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[var(--anchor-width)] p-1">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="min-h-8 px-2.5 pr-8">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
