'use client';

import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const VARIANT_STYLES = {
  danger: {
    icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
    confirm: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    confirm: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  info: {
    icon: 'bg-accent/10 text-accent',
    confirm: 'bg-accent text-white hover:bg-accent-hover',
  },
};

export default function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  loading = false,
}: DialogProps) {
  if (!open) return null;
  const styles = VARIANT_STYLES[variant];
  const Icon = variant === 'info' ? Info : AlertTriangle;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="sm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={loading} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            {cancelText}
          </button>
          <button type="button" onClick={() => void onConfirm()} disabled={loading} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles.confirm}`}>
            {loading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {loading ? '处理中' : confirmText}
          </button>
        </>
      )}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${styles.icon}`}>
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <p className="pt-1.5 text-sm leading-6 text-secondary-foreground">{message}</p>
      </div>
    </Modal>
  );
}
