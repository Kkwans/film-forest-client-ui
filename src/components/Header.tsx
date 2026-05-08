// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';

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
  const [keyword, setKeyword] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useUserStore();

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(keyword.trim())}`;
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

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
              style={{ color: 'var(--accent)' }}
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
              <input
                type="text"
                placeholder="搜索影片、演员、导演"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-40 lg:w-52 h-9 px-3 rounded-lg text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-lg text-white text-sm font-medium transition-colors shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              >
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
              title="切换深色模式"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Auth section - PC only show login (no register), entry point is inside login page */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--accent-light, #1a2332)', color: 'var(--accent)' }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback name={user.nickname || user.username} />
                    )}
                  </div>
                  <span className="text-sm font-medium max-w-[80px] truncate">
                    {user.nickname || user.username}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
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
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  >
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm transition-colors hover:opacity-80"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      我的
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); window.location.href = '/'; }}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                      style={{ color: 'var(--text-secondary)' }}
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
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  登录
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: dark toggle + user avatar + hamburger (login/register hidden, bottom nav has 我的) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleDark}
              className="w-8 h-8 flex items-center justify-center rounded-md border text-sm"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            {isAuthenticated && user ? (
              <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--accent-light, #1a2332)', color: 'var(--accent)' }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <AvatarFallback name={user.nickname || user.username} />
                )}
              </Link>
            ) : null}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-md border text-sm"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
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
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              导航菜单
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-md"
              style={{ color: 'var(--text-secondary)' }}
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
