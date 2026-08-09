'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, TreePine, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';
import { userApi } from '@/lib/userApi';
import { hasStoredToken, useUserStore } from '@/stores/userStore';

function safeReturnPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')
      || value.startsWith('/login') || value.startsWith('/change-password')) return '/';
  return value;
}

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get('from'));
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasStoredToken()) router.replace('/login?from=/change-password');
  }, [router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码长度至少 6 位');
      return;
    }
    if (newPassword === currentPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      if (user) setUser({ ...user, mustChangePassword: false });
      showToast('密码已更新', 'success');
      router.replace(returnPath);
    } catch (changeError: unknown) {
      setError(changeError instanceof Error && changeError.message
        ? changeError.message : '密码修改失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasStoredToken()) return null;

  return (
    <section className="mx-auto grid min-h-[calc(100dvh-13rem)] w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-lg)] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="relative hidden overflow-hidden bg-[#103b2e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15"><TreePine className="size-6" /></span><div><p className="text-sm font-semibold text-emerald-100">影视森林</p><p className="text-xs text-emerald-100/60">账户安全</p></div></div>
        <div><ShieldCheck className="size-8 text-emerald-300" /><h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.04em]">先设置你的私人密码。</h1><p className="mt-4 text-sm leading-7 text-emerald-50/70">管理员提供的临时密码仅用于首次登录。修改后才能访问片单、设置和其他个人功能。</p></div>
        <p className="text-xs leading-5 text-emerald-50/55">新密码会使用 BCrypt 保存，系统不会记录或回传明文。</p>
      </div>

      <div className="flex items-center px-5 py-9 sm:px-10 lg:px-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm" noValidate>
          <span className="mb-5 grid size-11 place-items-center rounded-2xl bg-[var(--accent-light)] text-accent"><KeyRound className="size-5" /></span>
          <p className="text-xs font-bold tracking-[0.18em] text-accent">PASSWORD REQUIRED</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-foreground">修改初始密码</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">完成后会继续前往你原本访问的页面。</p>

          {error && <div id="password-error" role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm text-[var(--danger)]"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-secondary-foreground">当前密码<Input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={submitting} className="mt-1.5 h-11" /></label>
            <label className="block text-sm font-semibold text-secondary-foreground">新密码<div className="relative mt-1.5"><Input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="至少 6 位" disabled={submitting} className="h-11 pr-11" /><button type="button" onClick={() => setShowPasswords((visible) => !visible)} aria-label={showPasswords ? '隐藏密码' : '显示密码'} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted">{showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
            <label className="block text-sm font-semibold text-secondary-foreground">确认新密码<Input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={submitting} className="mt-1.5 h-11" /></label>
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="mt-6 h-11 w-full font-bold">{submitting ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" />正在保存</> : '保存新密码并继续'}</Button>
        </form>
      </div>
    </section>
  );
}

export default function ChangePasswordPage() {
  return <Suspense fallback={<div className="min-h-[26rem]" />}><ChangePasswordForm /></Suspense>;
}
