'use client';

import dynamic from 'next/dynamic';
import type { DetailStatus } from '@/hooks/useDetailStatus';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });
const WatchedModal = dynamic(() => import('@/components/WatchedModal'), { ssr: false });

interface DetailButtonsProps {
  contentId: number;
  contentType: string;
  contentTitle: string;
  status: DetailStatus;
  collectOpen: boolean;
  watchedOpen: boolean;
  watchedReadOnly: boolean;
  onWantButtonClick: (e: React.MouseEvent) => void;
  onWatchedClick: () => void;
  onCollectClose: () => void;
  onWatchedClose: () => void;
  onWatchedEdit: () => void;
  onCollectOpen: () => void;
}

// Star rating mini display (compact, for the watched button)
function MiniStars({ rating }: { rating?: number }) {
  const r = rating || 0;
  return (
    <span className="inline-flex items-center gap-px">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill={i <= r ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
        </svg>
      ))}
    </span>
  );
}

// Format time for watched button
function formatWatchedTime(): string {
  // This would need the actual watched time from the API - for now return placeholder
  return '';
}

export default function DetailButtons({
  contentId, contentType, contentTitle, status,
  collectOpen, watchedOpen, watchedReadOnly,
  onWantButtonClick, onWatchedClick, onCollectClose, onWatchedClose, onWatchedEdit, onCollectOpen,
}: DetailButtonsProps) {
  if (status.watched) {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCollectOpen()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"

            title="选择片单"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>收藏</span>
          </button>
          <button
            onClick={onWatchedClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            
            title="点击查看评价"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>已看过</span>
            {status.watchedRating != null && status.watchedRating > 0 && (
              <>
                <MiniStars rating={Math.round(status.watchedRating)} />
                <span className="font-bold">{status.watchedRating.toFixed(1)}</span>
              </>
            )}
          </button>
        </div>
        <CollectModal open={collectOpen} onClose={onCollectClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
        <WatchedModal open={watchedOpen} onClose={onWatchedClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle}
          initialRating={watchedReadOnly ? status.watchedRating : undefined} initialNote={watchedReadOnly ? status.watchedNote : undefined}
          isReadOnly={watchedReadOnly} onEdit={onWatchedEdit} />
      </>
    );
  }

  if (status.watching) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCollectOpen()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>在看</span>
          </button>
          <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-accent"
            onMouseDown={() => onWatchedClick()}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>看过</span>
          </button>
        </div>
        <CollectModal open={collectOpen} onClose={onCollectClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
        <WatchedModal open={watchedOpen} onClose={onWatchedClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
      </>
    );
  }

  if (status.want_to_watch) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button onClick={onWantButtonClick} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            
            title="单击取消想看，双击选择片单">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>已想看</span>
          </button>
          <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-accent"
            onMouseDown={() => onWatchedClick()}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>看过</span>
          </button>
        </div>
        <CollectModal open={collectOpen} onClose={onCollectClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
        <WatchedModal open={watchedOpen} onClose={onWatchedClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
      </>
    );
  }

  // No status
  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={onWantButtonClick} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"

          title="单击加入想看，双击选择片单">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>想看</span>
        </button>
        <button onClick={() => onWatchedClick()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-accent" >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>看过</span>
        </button>
      </div>
      <CollectModal open={collectOpen} onClose={onCollectClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
      <WatchedModal open={watchedOpen} onClose={onWatchedClose} movieId={contentId} contentType={contentType} movieTitle={contentTitle} />
    </>
  );
}
