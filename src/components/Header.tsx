'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useUserStore } from '@/stores/userStore';
import { searchApi } from '@/lib/api';

const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '电影', href: '/movie' },
  { label: '电视剧', href: '/drama' },
  { label: '综艺', href: '/variety' },
  { label: '动漫', href: '/anime' },
  { label: '短剧', href: '/short' },
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useUserStore();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const isDark = mounted && resolvedTheme === 'dark';

  const toggleDark = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  const handleSearchInput = (value: string) => {
    setKeyword(value);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    suggestTimerRef.current = setTimeout(() => {
      searchApi.suggest(value.trim()).then(res => {
        setSuggestions(res.data?.data || []);
        setShowSuggestions(true);
      }).catch(() => setSuggestions([])).finally(() => setSuggestLoading(false));
    }, 300);
  };

  const handleSuggestionClick = (kw: string) => {
    setKeyword(kw);
    setShowSuggestions(false);
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
        className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌲</span>
            <span
              className="text-lg font-bold"

            >
              影视森林
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive(item.href)
                    ? 'nav-active'
                    : 'border-transparent hover:opacity-80'
                }`}
                style={{
                  color: isActive(item.href) ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search + Dark Toggle + Auth (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative" ref={searchWrapRef}>
                {/* Search icon */}
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="搜索影片、演员、导演"
                  value={keyword}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="header-search-input w-40 lg:w-52 h-9 pl-8 pr-7 rounded-lg text-sm outline-none border transition-colors focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                {/* Clear button */}
                {keyword && (
                  <button
                    type="button"
                    onClick={() => { setKeyword(''); setSuggestions([]); setShowSuggestions(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label="清除搜索"
                    title="清除"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                )}
                {showSuggestions && (suggestions.length > 0 || suggestLoading) && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg py-1 z-50 max-h-60 overflow-y-auto"
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
                        className="w-full text-left px-3 py-1.5 text-sm hover:opacity-80 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
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
                className="h-9 px-4 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 shrink-0 flex items-center gap-1"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                搜索
              </button>
            </form>
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
              title="切换深色模式"
            >
              {mounted ? (isDark ? '☀️' : '🌙') : '🌙'}
            </button>

            {/* Auth section - PC only show login (no register), entry point is inside login page */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors"

                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                    
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback name={user.nickname || user.username} />
                    )}
                  </div>
                  <svg
                    className={`w-3 h-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
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
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg py-1 z-50"

                  >
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm transition-colors rounded-md mx-1"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      我的
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); router.push('/'); }}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors rounded-md mx-1"
                      style={{ color: 'var(--danger, #ef4444)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-bg, rgba(239,68,68,0.1))'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"

                >
                  登录
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: dark toggle + hamburger (user info handled by bottom nav "我的" tab) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleDark}
              className="w-8 h-8 flex items-center justify-center rounded-md border text-sm"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
            >
              {mounted ? (isDark ? '☀️' : '🌙') : '🌙'}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-md border text-sm"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-56 border-l transform transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex flex-col p-4 gap-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-foreground" >
              导航菜单
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-md"

            >
              ✕
            </button>
          </div>

          {/* Mobile search */}
          <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} className="mb-3">
            <input
              type="text"
              placeholder="搜索影片..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none border"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </form>

          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href) ? '' : ''
              }`}
              style={{
                color: isActive(item.href) ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isActive(item.href) ? 'var(--accent-light)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
