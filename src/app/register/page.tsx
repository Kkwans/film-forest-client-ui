'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const register = useUserStore((s) => s.register);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  // 输入时自动清除错误
  const clearError = () => { if (error) setError(''); };

  const validate = (): string | null => {
    if (!username.trim()) return '请输入用户名';
    if (username.trim().length < 3 || username.trim().length > 20) return '用户名长度需要 3-20 个字符';
    if (!password) return '请输入密码';
    if (password.length < 6) return '密码长度至少 6 位';
    if (password !== confirmPassword) return '两次输入的密码不一致';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), password, email || undefined);
      showToast('注册成功，欢迎加入', 'success');
      router.replace('/');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(msg || '注册失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  /** Eye icon for password toggle */
  const EyeIcon = ({ visible }: { visible: boolean }) => (
    visible ? (
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
    )
  );

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
          <h1 className="text-2xl font-bold mt-3 text-foreground">
            注册影视森林
          </h1>
          <p className="text-sm mt-2 text-muted-foreground">
            创建你的影视收藏夹
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground">
              用户名 <span className="text-xs text-muted-foreground">(3-20个字符)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError(); }}
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
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground">
              密码 <span className="text-xs text-muted-foreground">(至少6位)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="请输入密码"
                autoComplete="new-password"
                className="w-full h-11 px-4 pr-10 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
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
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground">
              确认密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                placeholder="请再次输入密码"
                autoComplete="new-password"
                className="w-full h-11 px-4 pr-10 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
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
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-secondary-foreground">
              邮箱 <span className="text-xs text-muted-foreground">(可选)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              autoComplete="email"
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
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-muted-foreground">
          已有账号？{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
