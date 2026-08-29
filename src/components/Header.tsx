'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Search, TreePine, UserRound, X } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { searchApi } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '电影', href: '/movie' },
  { label: '剧集', href: '/drama' },
  { label: '综艺', href: '/variety' },
  { label: '动漫', href: '/anime' },
  { label: '短剧', href: '/short' },
  { label: '收藏', href: '/profile/lists' },
  { label: '设置', href: '/profile/settings' },
];

function AvatarFallback({ name }: { name?: string }) {
  const char = (name || '用').charAt(0);
  return (
    <span className="text-xs font-bold">{char}</span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestControllerRef = useRef<AbortController | null>(null);
  const suggestSequenceRef = useRef(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useUserStore();

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => () => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    const active = suggestions[activeSuggestion];
    const value = active || keyword;
    if (value.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleSearchInput = (value: string) => {
    setKeyword(value);
    setActiveSuggestion(-1);
    const sequence = ++suggestSequenceRef.current;
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestControllerRef.current?.abort();
    const normalized = value.trim();
    if (!normalized || Array.from(normalized).length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    suggestTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      suggestControllerRef.current = controller;
      searchApi.suggest(normalized, { signal: controller.signal }).then(res => {
        if (sequence !== suggestSequenceRef.current) return;
        setSuggestions(Array.isArray(res.data?.data) ? res.data.data : []);
        setShowSuggestions(true);
      }).catch((error) => {
        if (error?.name !== 'CanceledError' && error?.name !== 'AbortError' && sequence === suggestSequenceRef.current) setSuggestions([]);
      }).finally(() => {
        if (sequence === suggestSequenceRef.current) setSuggestLoading(false);
      });
    }, 300);
  };

  const handleSuggestionClick = (kw: string) => {
    setKeyword(kw);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    router.push(`/search?q=${encodeURIComponent(kw)}`);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Global keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.header-search-input')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-[120rem] items-center gap-5 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5 no-underline" aria-label="影视森林首页">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] transition-transform group-hover:-translate-y-0.5">
              <TreePine className="size-[19px]" strokeWidth={2.1} aria-hidden />
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.025em] text-foreground">影视森林</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden shrink-0 items-center gap-1 md:flex" aria-label="内容导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded-lg px-2.5 py-2 text-sm font-medium transition-colors lg:px-3 ${item.label === '收藏' || item.label === '设置' ? 'hidden xl:inline-flex' : 'inline-flex'} ${
                  isActive(item.href)
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-secondary-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search + Dark Toggle + Auth (desktop) */}
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex">
            <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div className="relative min-w-[220px] flex-1" ref={searchWrapRef}>
                {/* Search icon */}
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="size-4" aria-hidden />
                </div>
                <input
                  type="text"
                  placeholder="搜索影片、演员、导演"
                  value={keyword}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setShowSuggestions(false);
                      setActiveSuggestion(-1);
                      return;
                    }
                    if (event.key === 'ArrowDown' && suggestions.length > 0) {
                      event.preventDefault();
                      setShowSuggestions(true);
                      setActiveSuggestion((index) => (index + 1) % suggestions.length);
                    }
                    if (event.key === 'ArrowUp' && suggestions.length > 0) {
                      event.preventDefault();
                      setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length);
                    }
                    if (event.key === 'Enter' && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
                      event.preventDefault();
                      handleSuggestionClick(suggestions[activeSuggestion]);
                    }
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(event) => { setIsComposing(false); handleSearchInput(event.currentTarget.value); }}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="header-search-suggestions"
                  aria-expanded={showSuggestions && (suggestions.length > 0 || suggestLoading)}
                  aria-activedescendant={activeSuggestion >= 0 ? `header-suggestion-${activeSuggestion}` : undefined}
                  className="header-search-input h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--accent)]"
                />
                {/* Clear button */}
                {keyword && (
                  <button
                    type="button"
                    onClick={() => { setKeyword(''); setSuggestions([]); setShowSuggestions(false); }}
                    className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--accent-light)] hover:text-foreground"
                    aria-label="清除搜索"
                    title="清除"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
                {showSuggestions && (suggestions.length > 0 || suggestLoading) && (
                  <div
                    id="header-search-suggestions"
                    role="listbox"
                    aria-label="搜索建议"
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-lg)]"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    {suggestLoading && (
                      <div className="flex items-center justify-center py-3">
                        <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
                      </div>
                    )}
                    {!suggestLoading && suggestions.map((s, i) => (
                      <button
                        key={i}
                        id={`header-suggestion-${i}`}
                        role="option"
                        aria-selected={activeSuggestion === i}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors ${activeSuggestion === i ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--accent-light)]'}`}
                        onMouseDown={() => handleSuggestionClick(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <Search className="size-3.5" aria-hidden />
                搜索
              </button>
            </form>
            <ThemeToggle compact />

            {/* Auth section - PC only show login (no register), entry point is inside login page */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex h-10 items-center gap-2 rounded-xl bg-accent-light px-1.5 pr-2.5 text-accent transition-colors hover:bg-emerald-200/70 dark:hover:bg-emerald-900"
                  aria-label="打开用户菜单"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="flex size-7 items-center justify-center overflow-hidden rounded-lg bg-accent text-xs font-bold text-white">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 头像 URL 由用户数据提供，来源域名不固定。
                      <img src={user.avatar} alt="当前用户头像" className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback name={user.nickname || user.username} />
                    )}
                  </div>
                  <span className="hidden max-w-24 truncate text-xs font-semibold xl:inline">{user.nickname || user.username}</span>
                  <ChevronDown className={`size-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} strokeWidth={2.25} aria-hidden />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lg)]"
                  >
                    <div className="mb-1 border-b border-border px-3 pb-2 pt-1">
                      <p className="truncate text-sm font-semibold text-foreground">{user.nickname || user.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      role="menuitem"
                      className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-[var(--accent-light)]"
                    >
                      <UserRound className="size-4" aria-hidden />我的主页
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); router.push('/'); }}
                      role="menuitem"
                      className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-bg)]"
                    >
                      <LogOut className="size-4" aria-hidden />退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                >
                  登录
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: dark toggle + hamburger (user info handled by bottom nav "我的" tab) */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle compact />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-secondary-foreground lg:size-9"
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {menuOpen ? <X className="size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        id="mobile-navigation-drawer"
        aria-label="内容导航抽屉"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed right-0 top-0 z-50 h-dvh w-[min(86vw,21rem)] transform border-l border-border bg-card shadow-[var(--shadow-lg)] transition-transform duration-300 ease-in-out lg:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-1 p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-base font-bold text-foreground" >
              导航菜单
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex size-11 items-center justify-center rounded-xl text-secondary-foreground hover:bg-[var(--accent-light)] hover:text-foreground lg:size-9"
              aria-label="关闭导航菜单"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
          </div>

          {/* Mobile search */}
          <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} className="mb-3">
            <input
              type="text"
              placeholder="搜索影片..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--accent)]"
            />
          </form>

          {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${isActive(item.href) ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-secondary-foreground hover:bg-background hover:text-foreground'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
