'use client';

import dynamic from 'next/dynamic';
import { Bookmark, CheckCircle2, Eye, Heart, ListPlus, Loader2, Star } from 'lucide-react';
import type { DetailStatus } from '@/hooks/useDetailStatus';
import { formatWatchedAt, fractionalStarFill } from '@/lib/uiContracts';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });
const WatchedModal = dynamic(() => import('@/components/WatchedModal'), { ssr: false });

interface DetailButtonsProps {
  contentId: number;
  contentType: string;
  contentTitle: string;
  status: DetailStatus;
  statusLoading: boolean;
  watchedListId: number | null;
  collectOpen: boolean;
  watchedOpen: boolean;
  watchedReadOnly: boolean;
  onWantButtonClick: () => void;
  onWatchedClick: () => void;
  onCollectClose: () => void;
  onWatchedClose: () => void;
  onWatchedEdit: () => void;
  onCollectOpen: () => void;
}

function MiniStars({ rating }: { rating?: number }) {
  return (
    <span className="hidden items-center gap-px text-amber-500 sm:inline-flex" aria-hidden>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className="relative inline-flex h-3 w-3">
          <Star className="absolute inset-0 h-3 w-3" strokeWidth={1.5} />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fractionalStarFill(rating, index) * 100}%` }}>
            <Star className="h-3 w-3 max-w-none fill-current" strokeWidth={1.5} />
          </span>
        </span>
      ))}
    </span>
  );
}

const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-[border-color,background-color,color] hover:border-accent/40 hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60';

export default function DetailButtons({
  contentId,
  contentType,
  contentTitle,
  status,
  statusLoading,
  watchedListId,
  collectOpen,
  watchedOpen,
  watchedReadOnly,
  onWantButtonClick,
  onWatchedClick,
  onCollectClose,
  onWatchedClose,
  onWatchedEdit,
  onCollectOpen,
}: DetailButtonsProps) {
  const statusLabel = status.watching ? '正在看' : status.want_to_watch ? '已想看' : '想看';
  const StatusIcon = status.watching ? Eye : status.want_to_watch ? Heart : Bookmark;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 animate-fade-in-up stagger-5" aria-label="内容操作">
        {!status.watched && (
          <button
            type="button"
            onClick={status.watching ? onCollectOpen : onWantButtonClick}
            disabled={statusLoading}
            className={secondaryButton}
            aria-label={status.watching ? '管理正在看的片单状态' : status.want_to_watch ? '从想看移除' : '加入想看'}
          >
            {statusLoading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <StatusIcon aria-hidden className={`h-4 w-4 ${status.want_to_watch ? 'fill-current' : ''}`} />}
            {statusLoading ? '读取状态' : statusLabel}
          </button>
        )}

        <button type="button" onClick={onCollectOpen} className={secondaryButton} aria-haspopup="dialog">
          <ListPlus aria-hidden className="h-4 w-4" />
          管理片单
        </button>

        <button
          type="button"
          onClick={onWatchedClick}
          disabled={statusLoading}
          className={secondaryButton}
          aria-haspopup="dialog"
          aria-label={status.watched ? '查看我的评价' : '标记为看过并评价'}
        >
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          {status.watched ? '已看过' : '看过'}
          {status.watchedRating != null && status.watchedRating > 0 && (
            <>
              <MiniStars rating={status.watchedRating} />
              <span className="font-bold tabular-nums">{status.watchedRating.toFixed(1)}</span>
            </>
          )}
        </button>
      </div>

      {status.watched && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="观看记录">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-accent" />
            已标记看过
          </span>
          {status.watchedAt ? <span>· {formatWatchedAt(status.watchedAt)}</span> : null}
        </div>
      )}

      {collectOpen && (
        <CollectModal
          open={collectOpen}
          onClose={onCollectClose}
          movieId={contentId}
          contentType={contentType}
          movieTitle={contentTitle}
        />
      )}
      {watchedOpen && (
        <WatchedModal
          open={watchedOpen}
          onClose={onWatchedClose}
          movieId={contentId}
          contentType={contentType}
          movieTitle={contentTitle}
          watchedListId={watchedListId}
          initialRating={status.watchedRating}
          initialNote={status.watchedNote}
          initialWatchedAt={status.watchedAt}
          isExisting={status.watched}
          isReadOnly={watchedReadOnly}
          onEdit={onWatchedEdit}
        />
      )}
    </>
  );
}
