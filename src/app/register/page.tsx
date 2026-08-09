'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck, TicketCheck, TreePine, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';
import { userApi } from '@/lib/userApi';

type InvitationState = 'checking' | 'valid' | 'invalid';

function InvitationRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('invite')?.trim() || '';
  const { showToast } = useToast();
  const [invitationState, setInvitationState] = useState<InvitationState>('checking');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setInvitationState('invalid');
      return () => controller.abort();
    }
    setInvitationState('checking');
    void userApi.validateInvitation(token).then((response) => {
      if (controller.signal.aborted) return;
      const invitation = response.data.data;
      setInvitationState(invitation.valid ? 'valid' : 'invalid');
      setExpiresAt(invitation.expiresAt);
    }).catch(() => {
      if (!controller.signal.aborted) setInvitationState('invalid');
    });
    return () => controller.abort();
  }, [token]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username.trim())) {
      setError('用户名需为 3–30 位字母、数字或下划线');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await userApi.registerByInvitation({
        token,
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });
      showToast('账号已创建，请登录', 'success');
      router.replace(`/login?registered=1&username=${encodeURIComponent(username.trim())}`);
    } catch (registrationError: unknown) {
      setError(registrationError instanceof Error && registrationError.message
        ? registrationError.message : '注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (invitationState === 'checking') {
    return (
      <div className="grid min-h-[calc(100dvh-13rem)] place-items-center" role="status">
        <div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-accent motion-reduce:animate-none" /><p className="mt-3 text-sm text-muted-foreground">正在验证邀请…</p></div>
      </div>
    );
  }

  if (invitationState === 'invalid') {
    return (
      <section className="mx-auto grid min-h-[26rem] w-full max-w-lg place-items-center rounded-[1.75rem] border border-border bg-card px-6 text-center shadow-[var(--shadow-lg)]">
        <div>
          <TriangleAlert className="mx-auto size-10 text-amber-600 dark:text-amber-400" aria-hidden />
          <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">邀请链接不可用</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">该邀请可能已使用、已撤销或超过 24 小时有效期，请联系管理员重新生成。</p>
          <Link href="/login" className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-accent px-5 text-sm font-bold text-white no-underline hover:bg-accent-hover">返回登录</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid min-h-[calc(100dvh-13rem)] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-lg)] lg:grid-cols-[0.92fr_1.08fr]">
      <div className="relative hidden overflow-hidden bg-[#103b2e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -left-20 bottom-16 size-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15"><TreePine className="size-6" /></span><div><p className="text-sm font-semibold text-emerald-100">影视森林</p><p className="text-xs text-emerald-100/60">家庭成员专属邀请</p></div></div>
        <div className="relative">
          <p className="text-xs font-bold tracking-[0.22em] text-emerald-200/70">JOIN THE FOREST</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.15] tracking-[-0.04em]">建立你的私人观影档案。</h1>
          <p className="mt-5 text-sm leading-7 text-emerald-50/70">注册后即可跨设备同步片单、评分、播放记录和个性化海报偏好。</p>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm"><ShieldCheck className="mb-3 size-5 text-emerald-300" /><p className="font-semibold">一次性安全邀请</p><p className="mt-1 text-xs text-emerald-50/55">账号创建后，该邀请会立即失效。</p></div>
      </div>

      <div className="flex items-center px-5 py-9 sm:px-10 lg:px-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-md" noValidate>
          <div className="mb-7">
            <span className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)]"><TicketCheck className="size-5" aria-hidden /></span>
            <p className="text-xs font-bold tracking-[0.18em] text-accent">INVITATION VERIFIED</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-foreground">创建家庭账号</h2>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" />邀请有效{expiresAt ? `，至 ${new Date(expiresAt).toLocaleString('zh-CN')}` : ''}</p>
          </div>

          {error && <div id="register-error" role="alert" className="mb-5 flex gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm text-[var(--danger)]"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-secondary-foreground">用户名<Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="字母、数字、下划线" disabled={submitting} className="mt-1.5 h-11" /></label>
            <label className="text-sm font-semibold text-secondary-foreground">邮箱（可选）<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" disabled={submitting} className="mt-1.5 h-11" /></label>
            <label className="text-sm font-semibold text-secondary-foreground">密码<div className="relative mt-1.5"><Input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="至少 6 位" disabled={submitting} className="h-11 pr-11" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
            <label className="text-sm font-semibold text-secondary-foreground">确认密码<Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="再次输入密码" disabled={submitting} className="mt-1.5 h-11" /></label>
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="mt-6 h-11 w-full font-bold">{submitting ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" />正在创建</> : '创建账号'}</Button>
          <p className="mt-5 text-center text-xs text-muted-foreground">已有账号？ <Link href="/login" className="font-semibold text-accent no-underline hover:underline">返回登录</Link></p>
        </form>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="min-h-[26rem]" />}><InvitationRegisterForm /></Suspense>;
}
