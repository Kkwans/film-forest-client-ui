'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Home, Search, UserRound, type LucideIcon } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: '首页', href: '/', icon: Home },
  { label: '分类', href: '/category', icon: Clapperboard },
  { label: '搜索', href: '/search', icon: Search },
  { label: '我的', href: '/profile', icon: UserRound },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useUserStore();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/category') {
      return ['/category', '/movie', '/drama', '/variety', '/anime', '/short'].some(
        (p) => pathname.startsWith(p)
      );
    }
    if (href === '/search') return pathname.startsWith('/search');
    if (href === '/profile') return pathname.startsWith('/profile') || pathname.startsWith('/user/');
    return false;
  };

  return (
    <nav
      className="mobile-dock fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="navigation"
      aria-label="移动端导航"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-2">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium no-underline transition-colors ${active ? 'text-[var(--accent)]' : 'text-muted-foreground'}`}
            >
              <span className={`flex size-7 items-center justify-center rounded-lg transition-colors ${active ? 'bg-[var(--accent-light)]' : 'group-hover:bg-card'}`}>
                {tab.href === '/profile' && isAuthenticated && user?.avatar ? (
                  <img src={user.avatar} alt="当前用户头像" className="size-5 rounded-md object-cover" />
                ) : (
                  <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.8} aria-hidden />
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
