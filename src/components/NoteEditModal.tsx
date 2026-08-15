'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import RatingField from '@/components/RatingField';

interface NoteEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: string, rating?: number) => void | Promise<void>;
  initialNote?: string;
  initialRating?: number;
  isWatchedList?: boolean;
  movieTitle?: string;
  isReadOnly?: boolean;
  onEdit?: () => void;
}

export default function NoteEditModal({
  open,
  onClose,
  onSave,
  initialNote = '',
  initialRating,
  isWatchedList = false,
  movieTitle,
  isReadOnly = false,
  onEdit,
}: NoteEditModalProps) {
  const [note, setNote] = useState(initialNote);
  const [rating, setRating] = useState(initialRating || 0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote(initialNote);
    setRating(initialRating || 0);
    setSaveError(null);
  }, [initialNote, initialRating, open]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(note.trim(), isWatchedList && rating > 0 ? rating : undefined);
    } catch {
      setSaveError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const footer = isReadOnly ? (
    <>
      <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">关闭</button>
      <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"><Pencil aria-hidden className="h-4 w-4" />编辑</button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">取消</button>
      <button type="button" onClick={() => void handleSave()} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
        {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}{saving ? '保存中' : '保存'}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={isReadOnly ? (isWatchedList ? '评价详情' : '备注详情') : (isWatchedList ? '编辑评价' : '编辑备注')} description={movieTitle} width="sm" footer={footer}>
      <div className="space-y-6">
        {isWatchedList && <RatingField value={rating} onChange={setRating} readOnly={isReadOnly} />}
        <section>
          <label htmlFor="list-item-note" className="text-sm font-semibold text-foreground">{isWatchedList ? '观后感' : '备注'}</label>
          {isReadOnly ? (
            <div className="mt-2 min-h-24 whitespace-pre-wrap rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-secondary-foreground">
              {note || <span className="text-muted-foreground">{isWatchedList ? '暂未记录观后感' : '暂未添加备注'}</span>}
            </div>
          ) : (
            <>
              <textarea id="list-item-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={isWatchedList ? '记录一下看完后的感受……' : '记录收藏理由、观看计划或其他信息……'} rows={4} maxLength={500} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-accent" />
              <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{note.length}/500</p>
            </>
          )}
        </section>
        {saveError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
      </div>
    </Modal>
  );
}
