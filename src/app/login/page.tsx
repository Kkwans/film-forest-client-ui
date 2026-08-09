'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookmarkCheck,
  Clapperboard,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  TreePine,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';
import { useUserStore } from '@/stores/userStore';

function normalizeReturnPath(rawPath: string | null) {
  const candidate = rawPath?.trim();
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return '/';
  }

  try {
    const target = new URL(candidate, 'https://film-forest.local');
    if (target.origin !== 'https://film-forest.local' || target.pathname === '/login') {
      return '/';
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = normalizeReturnPath(searchParams.get('from'));
  const registered = searchParams.get('registered') === '1';
  const usernameHint = searchParams.get('username')?.trim() || '';
  const login = useUserStore((state) => state.login);
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (registered && usernameHint) setUsername(usernameHint);
  }, [registered, usernameHint]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      showToast('登录成功，欢迎回来', 'success');
      router.replace(user.mustChangePassword
        ? `/change-password?from=${encodeURIComponent(returnPath)}`
        : returnPath);
    } catch (loginError: unknown) {
      setError(loginError instanceof Error && loginError.message
        ? loginError.message
        : '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100dvh-13rem)] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-lg)] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-[#103b2e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
            maskImage: 'linear-gradient(to bottom, black, transparent 92%)',
          }}
        />
        <div aria-hidden className="absolute -right-24 top-12 size-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
            <TreePine className="size-6" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-100">影视森林</p>
            <p className="text-xs text-emerald-100/60">你的私人观影资料库</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 text-xs font-bold tracking-[0.22em] text-emerald-200/70">WELCOME BACK</p>
          <h1 className="text-4xl font-black leading-[1.15] tracking-[-0.04em]">
            回到森林，<br />继续你的观影旅程。
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-emerald-50/70">
            收藏想看内容、整理个人片单，并在不同设备上接续最近的播放进度。
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <BookmarkCheck className="mb-3 size-5 text-emerald-300" aria-hidden />
            <p className="font-semibold">片单随身同步</p>
            <p className="mt-1 text-xs text-emerald-50/55">想看、在看、看过井然有序</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <Clapperboard className="mb-3 size-5 text-emerald-300" aria-hidden />
            <p className="font-semibold">资源集中浏览</p>
            <p className="mt-1 text-xs text-emerald-50/55">从详情页直接找到可用资源</p>
          </div>
        </div>
      </div>

      <div className="flex items-center px-5 py-9 sm:px-10 lg:px-12">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm" noValidate>
          <div className="mb-8">
            <span className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] lg:hidden">
              <TreePine className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">MEMBER SIGN IN</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-foreground">登录账号</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">登录后可同步片单、评分和播放记录。</p>
          </div>

          {error && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm leading-5 text-[var(--danger)]"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {registered && !error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-sm leading-5 text-emerald-700 dark:text-emerald-300" role="status">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>账号已创建，请使用新账号登录。</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold text-secondary-foreground">
                用户名
              </label>
              <Input
                id="login-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className="h-11 px-3.5"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-secondary-foreground">
                密码
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-11 px-3.5 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {showPassword
                    ? <EyeOff className="size-4" aria-hidden />
                    : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="mt-1 h-11 w-full font-bold">
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                  正在登录
                </>
              ) : '登录'}
            </Button>
          </div>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <p>账号由管理员创建，或通过管理员发送的一次性邀请开通。</p>
          </div>
        </form>
      </div>
    </section>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-13rem)] items-center justify-center" role="status">
      <LoaderCircle className="size-5 animate-spin text-[var(--accent)] motion-reduce:animate-none" aria-hidden />
      <span className="sr-only">正在加载登录页面</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
