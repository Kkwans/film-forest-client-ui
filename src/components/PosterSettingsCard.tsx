'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { posterApi, type PosterEnrichmentJob, type PosterSetting } from '@/lib/userApi';
import { useToast } from '@/components/Toast';

const statusText: Record<PosterSetting['validationStatus'], string> = {
  not_configured: '未配置',
  unverified: '尚未验证',
  valid: '连接有效',
  invalid: '凭据无效',
  rate_limited: 'TMDB 当前限流',
  unavailable: 'TMDB 暂时不可用',
};

const errorText: Record<string, string> = {
  authentication_failed: 'TMDB 拒绝了该凭据，请替换后重试。',
  rate_limited: '请求达到 TMDB 限额，请稍后再试。',
  service_unavailable: 'TMDB 服务暂时不可用，当前仍会使用来源站原图。',
  network_error: 'NAS 无法连接 TMDB，当前仍会使用来源站原图。',
  interrupted: '验证请求已中断，请重试。',
  request_rejected: 'TMDB 拒绝了验证请求。',
  service_restarted: '服务重启时任务被安全中断，可手动重新开始。',
  worker_interrupted: '任务执行线程已中断，可手动重新开始。',
  internal_error: '任务遇到内部错误并已停止。',
  credential_not_configured: 'TMDB 凭据已清除，任务已停止。',
};

const jobStatusText: Record<PosterEnrichmentJob['status'], string> = {
  queued: '等待执行', running: '正在补全', cancel_requested: '正在取消', success: '已完成',
  partial_success: '部分完成', failed: '执行失败', cancelled: '已取消', interrupted: '已中断',
};

const jobTypeOptions = [
  { value: '', label: '全部内容' }, { value: 'movie', label: '电影' }, { value: 'drama', label: '剧集' },
  { value: 'variety', label: '综艺' }, { value: 'anime', label: '动漫' },
  { value: 'short_drama', label: '短剧' },
];

const emptySetting: PosterSetting = {
  posterSource: 'original', configured: false, credentialType: null, maskedHint: null,
  validationStatus: 'not_configured', validationErrorCode: null, validatedAt: null,
};

function notifyPosterSettingChanged() {
  window.dispatchEvent(new CustomEvent('poster-settings-changed'));
}

export default function PosterSettingsCard() {
  const { showToast } = useToast();
  const [setting, setSetting] = useState<PosterSetting>(emptySetting);
  const [credentialType, setCredentialType] = useState<'api_key' | 'read_access_token'>('api_key');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'save' | 'validate' | 'clear' | 'preference' | 'job' | 'cancel_job' | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [job, setJob] = useState<PosterEnrichmentJob | null>(null);
  const [jobType, setJobType] = useState('');
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    posterApi.getSettings().then(response => {
      if (cancelled) return;
      setSetting(response.data.data);
      if (response.data.data.credentialType) setCredentialType(response.data.data.credentialType);
    }).catch(() => {
      if (!cancelled) showToast('海报设置加载失败', 'error');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const response = await posterApi.latestJob();
        if (!cancelled) {
          setJob(response.data.data);
          setJobError(null);
        }
      } catch {
        if (!cancelled) setJobError('任务状态暂时无法读取');
      }
      if (!cancelled && job?.active) {
        timer = setTimeout(load, document.hidden ? 15000 : 4000);
      }
    };

    if (job?.active) timer = setTimeout(load, document.hidden ? 15000 : 4000);
    else if (job === null) void load();
    const onVisibility = () => {
      if (!document.hidden && job?.active) {
        if (timer) clearTimeout(timer);
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [job]);

  const updatePreference = async (posterSource: 'original' | 'tmdb') => {
    setAction('preference');
    try {
      const response = await posterApi.savePreference(posterSource);
      setSetting(response.data.data);
      notifyPosterSettingChanged();
      showToast(posterSource === 'tmdb' ? '已选择 TMDB 智能海报，失败时自动回退原图' : '已选择来源站原始海报', 'success');
    } catch {
      showToast('海报偏好保存失败', 'error');
    } finally {
      setAction(null);
    }
  };

  const saveCredential = async () => {
    if (credential.trim().length < 16) {
      showToast('请输入有效的 TMDB API 凭据', 'warning');
      return;
    }
    setAction('save');
    try {
      const response = await posterApi.saveCredential(credentialType, credential.trim());
      setSetting(response.data.data);
      setCredential('');
      notifyPosterSettingChanged();
      showToast(setting.configured ? 'TMDB 凭据已替换，请重新验证' : 'TMDB 凭据已加密保存，请执行连接验证', 'success');
    } catch {
      showToast('TMDB 凭据保存失败，未修改现有配置', 'error');
    } finally {
      setAction(null);
    }
  };

  const validateCredential = async () => {
    setAction('validate');
    try {
      const response = await posterApi.validateCredential();
      setSetting(response.data.data);
      showToast(response.data.data.validationStatus === 'valid' ? 'TMDB 连接验证成功' : 'TMDB 连接验证未通过，仍将回退原图', response.data.data.validationStatus === 'valid' ? 'success' : 'warning');
    } catch {
      showToast('连接验证请求失败，仍将回退原图', 'error');
    } finally {
      setAction(null);
    }
  };

  const clearCredential = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setAction('clear');
    try {
      if (job?.active) await posterApi.cancelJob(job.id).catch(() => undefined);
      const response = await posterApi.clearCredential();
      setSetting(response.data.data);
      setCredential('');
      setConfirmClear(false);
      notifyPosterSettingChanged();
      showToast('TMDB 凭据已清除，海报模式已切回来源站原图', 'success');
    } catch {
      showToast('凭据清除失败', 'error');
    } finally {
      setAction(null);
    }
  };

  const startJob = async () => {
    setAction('job');
    try {
      const response = await posterApi.startJob(jobType || undefined);
      setJob(response.data.data);
      setJobError(null);
      showToast('海报补全任务已进入队列', 'success');
    } catch {
      setJobError('任务启动失败，请确认 TMDB 模式和凭据状态');
      showToast('海报补全任务启动失败', 'error');
    } finally {
      setAction(null);
    }
  };

  const cancelJob = async () => {
    if (!job?.active) return;
    setAction('cancel_job');
    try {
      const response = await posterApi.cancelJob(job.id);
      setJob(response.data.data);
      setJobError(null);
      showToast('已请求取消海报补全任务', 'success');
    } catch {
      setJobError('任务取消请求失败，请重试');
    } finally {
      setAction(null);
    }
  };

  const validationMessage = setting.validationErrorCode
    ? errorText[setting.validationErrorCode] || '验证未通过，当前仍会使用来源站原图。'
    : null;
  const progress = job && job.totalCount > 0
    ? Math.min(100, Math.round((job.processedCount / job.totalCount) * 100)) : 0;

  return (
    <section className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-sm font-bold text-foreground">海报来源</h3><p className="mt-1 text-xs text-muted-foreground">原图始终保留；TMDB 未匹配、超时、限流或密钥无效时自动回退。</p></div>
        <Link href="/about#tmdb" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>TMDB 署名与说明 →</Link>
      </div>

      {loading ? <div className="mt-4 h-32 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }} /> : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'original' as const, title: '来源站原始海报', desc: '始终展示爬虫保存的原图' },
              { key: 'tmdb' as const, title: 'TMDB 智能识别', desc: '优先已确认的 TMDB 海报' },
            ]).map(option => {
              const selected = setting.posterSource === option.key;
              return <button key={option.key} disabled={action !== null} onClick={() => void updatePreference(option.key)} className="rounded-xl border-2 p-3 text-left transition-colors" style={{ borderColor: selected ? 'var(--accent)' : 'var(--border-color)', backgroundColor: selected ? 'var(--bg-primary)' : 'var(--bg-card)' }}><span className="block text-sm font-medium text-foreground">{option.title}</span><span className="mt-1 block text-xs text-muted-foreground">{option.desc}</span></button>;
            })}
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-sm font-medium text-foreground">TMDB 应用凭据</p><p className="mt-0.5 text-xs text-muted-foreground">{setting.configured ? `${setting.credentialType === 'api_key' ? 'API Key' : 'Read Access Token'} · ${setting.maskedHint}` : '尚未配置；凭据仅以加密密文保存在服务端'}</p></div>
              <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: setting.validationStatus === 'valid' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-card)', color: setting.validationStatus === 'valid' ? 'var(--accent)' : 'var(--text-secondary)' }}>{statusText[setting.validationStatus]}</span>
            </div>
            {validationMessage && <p className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(245,158,11,.12)', color: '#b45309' }}>{validationMessage}</p>}

            <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <select aria-label="TMDB 凭据类型" value={credentialType} onChange={event => setCredentialType(event.target.value as 'api_key' | 'read_access_token')} className="h-11 rounded-lg border px-3 text-sm outline-none" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}><option value="api_key">API Key</option><option value="read_access_token">Read Access Token</option></select>
              <input type="password" autoComplete="off" value={credential} onChange={event => setCredential(event.target.value)} placeholder={setting.configured ? '输入新凭据以替换现有配置' : '输入自己的 TMDB 应用凭据'} className="h-10 rounded-lg border px-3 text-sm outline-none" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <button onClick={() => void saveCredential()} disabled={action !== null || credential.trim().length < 16} className="h-10 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>{action === 'save' ? '保存中' : setting.configured ? '替换' : '保存'}</button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void validateCredential()} disabled={!setting.configured || action !== null} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>{action === 'validate' ? '验证中...' : '验证连接'}</button>
              {setting.configured && <button onClick={() => void clearCredential()} disabled={action !== null} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor: '#ef4444', color: '#ef4444' }}>{action === 'clear' ? '清除中...' : confirmClear ? '再次点击确认清除' : '清除凭据'}</button>}
              {confirmClear && <button onClick={() => setConfirmClear(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground">取消</button>}
            </div>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="text-sm font-medium text-foreground">后台批量补全</p><p className="mt-0.5 text-xs text-muted-foreground">仅由你手动启动，不会建立周期任务；列表展示仍会在失败时回退原图。</p></div>
              {job && <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--bg-card)', color: job.active ? 'var(--accent)' : 'var(--text-secondary)' }}>{jobStatusText[job.status]}</span>}
            </div>

            {job && (
              <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>进度 {job.processedCount} / {job.totalCount}</span><span>{progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-color)' }}><div className="h-full rounded-full transition-[width]" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} /></div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-md px-2 py-1 text-muted-foreground" style={{ backgroundColor: 'var(--bg-primary)' }}>匹配 {job.matchedCount}</span><span className="rounded-md px-2 py-1 text-muted-foreground" style={{ backgroundColor: 'var(--bg-primary)' }}>待确认 {job.pendingCount}</span><span className="rounded-md px-2 py-1 text-muted-foreground" style={{ backgroundColor: 'var(--bg-primary)' }}>失败 {job.failedCount}</span></div>
                {job.currentContentType && <p className="mt-2 text-xs text-muted-foreground">当前：{job.currentContentType} #{job.currentContentId}</p>}
                {job.errorSummary && <p className="mt-2 text-xs" style={{ color: '#b45309' }}>{errorText[job.errorSummary] || `任务停止原因：${job.errorSummary}`}</p>}
              </div>
            )}
            {jobError && <p className="mt-2 text-xs" style={{ color: '#b45309' }}>{jobError}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <select aria-label="批量补全内容类型" value={jobType} onChange={event => setJobType(event.target.value)} disabled={job?.active || action !== null} className="h-11 rounded-lg border px-3 text-xs outline-none disabled:opacity-50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>{jobTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <button onClick={() => void startJob()} disabled={setting.posterSource !== 'tmdb' || !setting.configured || job?.active || action !== null} className="h-11 rounded-lg px-3 text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>{action === 'job' ? '启动中...' : '开始补全'}</button>
              {job?.active && <button onClick={() => void cancelJob()} disabled={action !== null || job.status === 'cancel_requested'} className="h-11 rounded-lg border px-3 text-xs font-medium disabled:opacity-50" style={{ borderColor: '#ef4444', color: '#ef4444' }}>{action === 'cancel_job' ? '取消中...' : '取消任务'}</button>}
            </div>
            {setting.posterSource !== 'tmdb' && <p className="mt-2 text-xs text-muted-foreground">选择“TMDB 智能识别”后才能启动。</p>}
          </div>
        </div>
      )}
    </section>
  );
}
