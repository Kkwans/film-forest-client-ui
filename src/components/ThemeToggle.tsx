'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

const THEME_LABELS: Record<Theme, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // next-themes cannot know the persisted client preference during SSR. Keep the
  // server and first client render identical, then reveal the resolved setting.
  const currentTheme: Theme = mounted && (theme === 'light' || theme === 'dark') ? theme : 'system';
  const ResolvedIcon = currentTheme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${compact ? 'size-11 rounded-xl lg:size-9' : 'h-11 rounded-xl px-3 lg:h-9'} inline-flex items-center justify-center gap-2 border border-border bg-card text-secondary-foreground outline-none transition-colors hover:border-[var(--accent)]/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 data-[popup-open]:border-[var(--accent)]/40 data-[popup-open]:text-foreground`}
        aria-label={`切换主题，当前${THEME_LABELS[currentTheme]}`}
        title={`外观：${THEME_LABELS[currentTheme]}`}
      >
        <ResolvedIcon className="size-4" aria-hidden />
        {!compact && <span className="text-xs font-semibold">{THEME_LABELS[currentTheme]}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 border border-border bg-card text-foreground shadow-[var(--shadow-lg)] ring-0"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>页面外观</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={currentTheme} onValueChange={(value) => setTheme(value as Theme)}>
            <DropdownMenuRadioItem value="system">
              <Monitor aria-hidden />
              跟随系统
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun aria-hidden />
              浅色
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon aria-hidden />
              深色
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
