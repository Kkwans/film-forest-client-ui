
'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';
  const login = useUserStore((s) => s.login);
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      showToast('登录成功，欢迎回来', 'success');
      router.replace(from);
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`w-full max-w-[400px] mx-4 rounded-2xl border p-8 transition-transform ${
          shaking ? 'animate-shake' : ''
        }`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: error ? 'var(--danger)' : 'var(--border-color)',
        }}
      >
        <div className="text-center mb-8">
          <span className="text-4xl">🌲</span>
          <h1 className="text-2xl font-bold mt-3 text-foreground" >
            登录影视森林
          </h1>
          <p className="text-sm mt-2 text-muted-foreground" >
            欢迎回来
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm flex items-center gap-2"

            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground" >
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              className="w-full h-11 px-4 rounded-lg text-sm border outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: error ? 'var(--danger)' : 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground" >
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full h-11 px-4 pr-10 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: error ? 'var(--danger)' : 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-50"

          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="text-center text-sm mt-6 text-muted-foreground" >
          还没有账号？{' '}
          <Link href="/register" className="font-medium hover:underline text-accent" >
            注册
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-secondary-foreground" >加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
