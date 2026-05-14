// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { listApi, type UserList } from '@/lib/userApi';

interface WatchedModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  contentType: string;
  movieTitle?: string;
  initialRating?: number;
  initialNote?: string;
  isReadOnly?: boolean;
  onEdit?: () => void;
}

const RATING_LEVELS = [
  { value: 1, label: '很差', color: 'var(--rating-low)' },
  { value: 2, label: '很差', color: 'var(--rating-low)' },
  { value: 3, label: '较差', color: 'var(--rating-low)' },
  { value: 4, label: '一般', color: 'var(--rating-6)' },
  { value: 5, label: '还行', color: 'var(--rating-6)' },
  { value: 6, label: '中等', color: 'var(--rating-6)' },
  { value: 7, label: '较好', color: 'var(--rating-7)' },
  { value: 8, label: '良好', color: 'var(--rating-7)' },
  { value: 9, label: '优秀', color: 'var(--rating-8)' },
  { value: 10, label: '神作', color: 'var(--rating-9)' },
];

export default function WatchedModal({ open, onClose, movieId, contentType, movieTitle, initialRating, initialNote, isReadOnly, onEdit }: WatchedModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [watchedListId, setWatchedListId] = useState<number | null>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRating(initialRating || 0);
      setHoverRating(0);
      setNote(initialNote || '');
      listApi.getAll().then(res => {
        const lists = res.data.data || res.data;
        const watched = Array.isArray(lists) ? lists.find((l: any) => l.type === 'watched') : null;
        if (watched) setWatchedListId(watched.id);
      }).catch(() => {});
    }
  }, [open, initialRating, initialNote]);

  const handleSave = async () => {
    if (!watchedListId) return;
    setSaving(true);
    try {
      await listApi.addItem(watchedListId, {
        movieId,
        contentType,
        rating: rating > 0 ? rating : undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  };

  // Calculate rating from X position relative to stars
  // Each star is 28px wide, gap-0.5 = 2px, so 10 stars = 10*28 + 9*2 = 298px
  const STAR_W = 28;
  const STAR_GAP = 2;
  const STAR_COUNT = 10;
  const TOTAL_STAR_W = STAR_COUNT * STAR_W + (STAR_COUNT - 1) * STAR_GAP;

  const calcRatingFromX = (clientX: number) => {
    if (!starsRef.current) return 0;
    const rect = starsRef.current.getBoundingClientRect();
    // Stars are centered in the container
    const starsStart = rect.left + (rect.width - TOTAL_STAR_W) / 2;
    const x = clientX - starsStart;
    const ratio = Math.max(0, Math.min(1, x / TOTAL_STAR_W));
    const raw = ratio * 10;
    return Math.round(raw * 2) / 2; // Snap to 0.5 increments
  };

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    setHoverRating(calcRatingFromX(e.clientX));
  };
  const handleClick = (e: React.MouseEvent) => {
    const val = calcRatingFromX(e.clientX);
    setRating(val === rating ? 0 : val);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setHoverRating(calcRatingFromX(touch.clientX));
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setHoverRating(calcRatingFromX(touch.clientX));
  };
  const handleTouchEnd = () => {
    if (hoverRating > 0) {
      setRating(hoverRating === rating ? 0 : hoverRating);
    }
    setHoverRating(0);
  };

  if (!open) return null;

  const displayRating = hoverRating || rating;
  const level = RATING_LEVELS.find(l => l.value === Math.ceil(displayRating)) || RATING_LEVELS[0];

  // Render star bar: continuous bar with star pattern
  const renderStarBar = () => {
    const activeSteps = Math.round((hoverRating || rating) * 2); // 0-20
    return (
      <div
        ref={starsRef}
        className={`flex items-center justify-center gap-0.5 select-none touch-none ${isReadOnly ? '' : 'cursor-pointer'}`}
        onMouseMove={isReadOnly ? undefined : handleMouseMove}
        onMouseLeave={isReadOnly ? undefined : () => setHoverRating(0)}
        onClick={isReadOnly ? undefined : handleClick}
        onTouchStart={isReadOnly ? undefined : handleTouchStart}
        onTouchMove={isReadOnly ? undefined : handleTouchMove}
        onTouchEnd={isReadOnly ? undefined : handleTouchEnd}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((starIndex) => {
          const fillRatio = Math.max(0, Math.min(1, activeSteps / 2 - starIndex));
          const id = `star-clip-watched-${starIndex}`;
          return (
            <svg key={starIndex} width="28" height="28" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <defs>
                <clipPath id={id}>
                  <rect x="0" y="0" width={fillRatio * 24} height="24" />
                </clipPath>
              </defs>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                fill="none" stroke={level.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {fillRatio > 0 && (
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  fill={level.color} stroke={level.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  clipPath={`url(#${id})`} />
              )}
            </svg>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', maxHeight: '75vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{isReadOnly ? '评价详情' : initialRating ? '编辑评价' : '标记看过'}</h3>
            {movieTitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{movieTitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>评分</label>
            {renderStarBar()}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-2xl font-bold tabular-nums" style={{ color: displayRating > 0 ? level.color : 'var(--text-muted)', minWidth: '2.5rem', textAlign: 'center' }}>
                {displayRating > 0 ? displayRating.toFixed(1) : '-'}
              </span>
              {displayRating > 0 && (
                <span className="text-sm px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${level.color}15`, color: level.color }}>
                  {level.label}
                </span>
              )}
            </div>
            {!isReadOnly && <p className="text-center text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>点击星星或左右滑动选择（支持半星，满分10.0）</p>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>感想</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isReadOnly ? '暂无感想' : '记录一下看完的感受...'}
              rows={4}
              maxLength={500}
              readOnly={isReadOnly}
              className="w-full px-4 py-3 rounded-lg text-sm border outline-none resize-none"
              style={{ backgroundColor: isReadOnly ? 'var(--bg-secondary)' : 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', opacity: isReadOnly ? 0.7 : 1 }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{note.length}/500</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          {isReadOnly ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>关闭</button>
              <button onClick={() => onEdit?.()} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>编辑</button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>取消</button>
              <button onClick={handleSave} disabled={saving || !watchedListId} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>
                {saving ? '保存中...' : '确认'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
