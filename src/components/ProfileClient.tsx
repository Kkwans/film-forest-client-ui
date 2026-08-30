'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ChevronRight,
  FolderHeart,
  Info,
  LogOut,
  Monitor,
  Moon,
  Palette,
  SearchX,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import PosterSettingsCard from '@/components/PosterSettingsCard';
import UserAvatar from '@/components/ui/UserAvatar';
import CollectionWorkspace from '@/components/CollectionWorkspace';
import ProfileDashboard from '@/components/ProfileDashboard';

interface TabDefinition {
  key: ProfileView;
  label: string;
  description: string;
  href: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export type ProfileView = 'home' | 'lists' | 'archive' | 'settings';

const PROFILE_NAV: TabDefinition[] = [
  { key: 'home', label: '个人主页', description: '账户与收藏概览', href: '/profile', Icon: UserRound },
  { key: 'lists', label: '我的收藏', description: '观看状态、评分与自定义片单', href: '/profile/lists', Icon: FolderHeart },
  { key: 'settings', label: '设置', description: '外观、账户与数据源', href: '/profile/settings', Icon: Settings },
];

function SettingsTab() {
  const { user, logout } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const clearSearchHistory = () => {
    try {
      localStorage.removeItem('search_history');
      showToast('搜索历史已清除', 'success');
    } catch {
      showToast('搜索历史清除失败', 'error');
    }
  };

  const themeOptions = [
    { key: 'light', label: '浅色', description: '明亮暖中性色', Icon: Sun },
    { key: 'dark', label: '深色', description: '炭黑沉浸观影', Icon: Moon },
    { key: 'system', label: '跟随系统', description: '自动切换', Icon: Monitor },
  ] as const;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2">
      <section className="border-b border-border p-5 md:border-r">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">账户信息</h2></div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">用户名</dt><dd className="truncate font-medium text-foreground">{user?.username || '—'}</dd></div>
          {user?.nickname && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">昵称</dt><dd className="truncate font-medium text-foreground">{user.nickname}</dd></div>}
          {user?.email && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">邮箱</dt><dd className="truncate font-medium text-foreground">{user.email}</dd></div>}
        </dl>
      </section>

      <section className="border-b border-border p-5">
        <div className="flex items-center gap-2"><Palette aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">显示外观</h2></div>
        <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="主题模式">
          {themeOptions.map((option) => {
            const active = themeMounted && theme === option.key;
            return <button key={option.key} type="button" role="radio" aria-checked={active} onClick={() => setTheme(option.key)} className={`grid min-h-24 place-items-center rounded-xl border p-2 text-center transition-[border-color,background-color] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary-foreground hover:border-accent/30'}`}><option.Icon aria-hidden className="h-5 w-5" /><span className="text-xs font-semibold">{option.label}</span><span className="hidden text-[10px] text-muted-foreground sm:block">{option.description}</span></button>;
          })}
        </div>
      </section>

      <div className="order-5 border-t border-border p-5 md:col-span-2">
        <div className="mb-4"><p className="text-xs font-semibold text-accent">高级设置</p><h2 className="mt-1 text-base font-semibold text-foreground">海报与数据源</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">只有需要替换来源站海报时才需要配置；所有失败都会保留原图。</p></div>
        <PosterSettingsCard />
      </div>

      <section className="order-3 border-b border-border p-5 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2"><SearchX aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">本地数据</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">搜索历史仅保存在当前浏览器，清除不会影响片单或账户数据。</p>
        <button type="button" onClick={clearSearchHistory} className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">清除搜索历史</button>
      </section>

      <section className="order-4 border-b border-border p-5 md:border-b-0">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">项目信息</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">查看影视森林的数据来源、TMDB 署名与项目说明。</p>
        <Link href="/about" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground no-underline hover:border-accent/40 hover:text-accent">查看项目说明<ChevronRight aria-hidden className="h-4 w-4" /></Link>
      </section>

      <div className="order-6 border-t border-border p-5 md:col-span-2">
        <button type="button" onClick={() => { logout(); router.replace('/'); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-5 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400"><LogOut aria-hidden className="h-4 w-4" />退出登录</button>
      </div>
    </div>
  );
}

export default function ProfileClient({ view = 'home' }: { view?: ProfileView }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();

  useEffect(() => {
    if (!hasStoredToken()) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
  }, [pathname, router]);

  if (!hasStoredToken()) return null;

  const current = PROFILE_NAV.find((item) => item.key === view) || PROFILE_NAV[0];
  const collectionView = view === 'lists' || view === 'archive';

  return (
    <div className={`mx-auto w-full ${collectionView ? 'max-w-[100rem]' : 'max-w-[92rem]'} space-y-5`}>
      <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between" aria-label="个人信息与页面导航">
        <div className="flex min-w-0 items-center gap-3"><UserAvatar name={user?.nickname || user?.username} src={user?.avatar || user?.avatarUrl} size="lg" className="shadow-sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{user?.nickname || user?.username || '影视森林用户'}</p><div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="truncate">{user?.username ? `@${user.username}` : '个人收藏'}</span><span aria-hidden>·</span><span>{current.label}</span></div></div></div>
        <nav className="filter-scroll-row rounded-xl bg-card p-1" aria-label="个人中心">{PROFILE_NAV.map((item) => <Link key={item.key} href={item.href} aria-current={view === item.key ? 'page' : undefined} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium no-underline transition-colors ${view === item.key ? 'bg-accent text-white shadow-sm' : 'text-secondary-foreground hover:bg-muted'}`}><item.Icon aria-hidden className="h-4 w-4" />{item.label}</Link>)}</nav>
      </header>

      <div><h1 className="text-2xl font-bold tracking-tight text-foreground">{current.label}</h1><p className="mt-1 text-sm text-muted-foreground">{current.description}</p></div>

      {view === 'home' && <ProfileDashboard />}
      {collectionView && <CollectionWorkspace />}
      {view === 'settings' && <SettingsTab />}
    </div>
  );
}
