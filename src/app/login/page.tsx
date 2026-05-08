// @ts-nocheck
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';
  const login = useUserStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace(from);
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div
        className="w-full max-w-[400px] mx-4 rounded-2xl border p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-center mb-8">
          <span className="text-4xl">🌲</span>
          <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
            登录影视森林
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            欢迎回来
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
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
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              className="w-full h-11 px-4 rounded-lg text-sm border outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          还没有账号？{' '}
          <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
