'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, LogIn, Pencil } from 'lucide-react';
import { listApi, type UserDefaultList } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/ui/modal';
import { useUserStore } from '@/stores/userStore';
import RatingField from '@/components/RatingField';
import { formatWatchedAt } from '@/lib/uiContracts';
import { contentStatusKey, useContentStatusStore } from '@/stores/contentStatusStore';

interface WatchedModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  contentType: string;
  movieTitle?: string;
  initialRating?: number;
  initialNote?: string;
  initialWatchedAt?: string;
  isReadOnly?: boolean;
  isExisting?: boolean;
  onEdit?: () => void;
  watchedListId?: number | null;
}

export default function WatchedModal({
  open,
  onClose,
  movieId,
  contentType,
  movieTitle,
  initialRating,
  initialNote,
  initialWatchedAt,
  isReadOnly = false,
  isExisting = false,
  onEdit,
  watchedListId: watchedListIdProp,
}: WatchedModalProps) {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const { showToast } = useToast();
  const userId = useUserStore((state) => state.user?.id ?? null);
  const patchStatus = useContentStatusStore((state) => state.patchStatus);
  const existingStatus = useContentStatusStore((state) => userId
    ? state.values[contentStatusKey(contentType, movieId)]
    : null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [watchedListId, setWatchedListId] = useState<number | null>(watchedListIdProp ?? null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(initialRating || 0);
    setNote(initialNote || '');
    setSaveError(null);
    setLoadError(null);

    if (!isAuthenticated || watchedListIdProp) {
      setWatchedListId(watchedListIdProp ?? null);
      setLoadingList(false);
      return;
    }

    const controller = new AbortController();
    setLoadingList(true);
    void listApi.getDefaults(false, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const lists = Array.isArray(response.data.data) ? response.data.data : [];
        const watched = lists.find((list: UserDefaultList) => list.type === 'watched');
        if (watched) {
          setWatchedListId(watched.id);
        } else {
          setLoadError('系统未找到默认“看过”片单');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('观看状态加载失败，请关闭后重试');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });

    return () => controller.abort();
  }, [initialNote, initialRating, isAuthenticated, open, watchedListIdProp]);

  const handleSave = async () => {
    if (!watchedListId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        movieId,
        contentType,
        rating: rating > 0 ? rating : undefined,
        note: note.trim() || undefined,
      };
      if (isExisting) await listApi.updateItem(watchedListId, payload);
      else await listApi.addItem(watchedListId, payload);
      showToast('观看状态与评价已保存', 'success');
      if (userId) patchStatus(`user:${userId}`, contentType, movieId, {
        listType: 'watched',
        listName: '看过',
        wantToWatch: existingStatus?.wantToWatch ?? false,
      });
      onClose();
    } catch {
      setSaveError('保存失败，请检查网络后重试');
      showToast('评价保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const footer = isAuthenticated ? (
    isReadOnly ? (
      <>
        <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">
          关闭
        </button>
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">
          <Pencil aria-hidden className="h-4 w-4" />编辑评价
        </button>
      </>
    ) : (
      <>
        <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
          取消
        </button>
        <button type="button" onClick={() => void handleSave()} disabled={saving || loadingList || !watchedListId} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden className="h-4 w-4" />}
          {saving ? '保存中' : rating > 0 || note.trim() ? '保存评价' : '仅标记看过'}
        </button>
      </>
    )
  ) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReadOnly ? '我的评价' : isExisting ? '编辑评价' : '标记为看过'}
      description={movieTitle}
      width="lg"
      footer={footer}
    >
      {!isAuthenticated ? (
        <div className="grid place-items-center py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-light text-accent">
            <LogIn aria-hidden className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">登录后记录观看与评价</h3>
          <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">你的观看状态、评分和感想会同步到个人片单。</p>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
            }}
            className="mt-5 min-h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            去登录
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm">
              <CheckCircle2 aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{isExisting ? '已记录为看过' : '准备记录为看过'}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {isExisting && initialWatchedAt ? `记录于 ${formatWatchedAt(initialWatchedAt)}` : '评分、观后感均可选，直接保存即可完成标记'}
              </p>
            </div>
          </div>

          <RatingField value={rating} onChange={setRating} readOnly={isReadOnly} />

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="watched-note" className="text-sm font-semibold text-foreground">观后感</label>
              {isExisting && initialWatchedAt && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
                  <Clock3 aria-hidden className="size-3.5" />{formatWatchedAt(initialWatchedAt)}
                </span>
              )}
            </div>
            {isReadOnly ? (
              <div className="mt-3 min-h-24 whitespace-pre-wrap rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-secondary-foreground">
                {note || <span className="text-muted-foreground">暂未记录观后感</span>}
              </div>
            ) : (
              <>
                <textarea
                  id="watched-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="记录一下看完后的感受……"
                  rows={4}
                  maxLength={500}
                  className="mt-3 min-h-28 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{note.length}/500</p>
              </>
            )}
          </section>

          {loadingList && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />正在准备“看过”片单
            </p>
          )}
          {(loadError || saveError) && (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {loadError || saveError}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
