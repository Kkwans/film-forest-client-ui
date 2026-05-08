// @ts-nocheck
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { useUserStore } from '@/stores/userStore';

const TABS = [
  { label: '首页', href: '/', icon: '🏠' },
  { label: '分类', href: '/category', icon: '📂' },
  { label: '搜索', href: '/search', icon: '🔍' },
  { label: '我的', href: '/profile', icon: 'user' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
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

  const handleNav = (href: string) => {
    if (isActive(href)) return;
    setNavigatingTo(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const isTabLoading = isPending && navigatingTo === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                handleNav(tab.href);
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs no-underline"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                opacity: isTabLoading ? 0.6 : 1,
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <span className="text-lg leading-none relative">
                {isTabLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : tab.icon === 'user' ? (
                  isAuthenticated && user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : isAuthenticated ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  )
                ) : (
                  tab.icon
                )}
              </span>
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
