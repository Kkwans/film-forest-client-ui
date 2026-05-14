// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';

interface NoteEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: string, rating?: number) => void;
  initialNote?: string;
  initialRating?: number;
  isWatchedList?: boolean;
  movieTitle?: string;
}

function getRatingLabel(r: number): string {
  if (r >= 9) return '神作';
  if (r >= 8) return '顶级';
  if (r >= 7) return '推荐';
  if (r >= 6) return '还行';
  if (r >= 4) return '很差';
  if (r >= 2) return '拉完了';
  if (r >= 0.5) return '屎';
  return '';
}

function getRatingColor(r: number): string {
  if (r >= 9) return 'var(--rating-9)';
  if (r >= 8) return 'var(--rating-8)';
  if (r >= 7) return 'var(--rating-7)';
  if (r >= 6) return 'var(--rating-6)';
  if (r >= 4) return 'var(--rating-low)';
  return 'var(--rating-none)';
}

export default function NoteEditModal({ open, onClose, onSave, initialNote = '', initialRating, isWatchedList = false, movieTitle }: NoteEditModalProps) {
  const [note, setNote] = useState(initialNote);
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setNote(initialNote);
      setRating(initialRating || 0);
      setHoverRating(0);
    }
  }, [open, initialNote, initialRating]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note, isWatchedList && rating > 0 ? rating : undefined);
    } catch (err) {
      console.error('Save note failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // 10 stars, each 24px wide, 2px gap. Total = 10*24 + 9*2 = 258px
  const STAR_W = 24;
  const STAR_GAP = 2;
  const STAR_COUNT = 10;
  const TOTAL_STAR_W = STAR_COUNT * STAR_W + (STAR_COUNT - 1) * STAR_GAP;

  const calcRatingFromX = (clientX: number): number => {
    if (!starsRef.current) return 0;
    const rect = starsRef.current.getBoundingClientRect();
    const starsStart = rect.left + (rect.width - TOTAL_STAR_W) / 2;
    const x = clientX - starsStart;
    const ratio = Math.max(0, Math.min(1, x / TOTAL_STAR_W));
    // Map 0-1 to 0.5-10.0
    const raw = ratio * 10;
    return Math.round(raw * 2) / 2;
  };

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent) => setHoverRating(calcRatingFromX(e.clientX));
  const handleClick = (e: React.MouseEvent) => {
    const v = calcRatingFromX(e.clientX);
    setRating(v === rating ? 0 : v);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => setHoverRating(calcRatingFromX(e.touches[0].clientX));
  const handleTouchMove = (e: React.TouchEvent) => setHoverRating(calcRatingFromX(e.touches[0].clientX));
  const handleTouchEnd = () => {
    if (hoverRating > 0) setRating(hoverRating === rating ? 0 : hoverRating);
    setHoverRating(0);
  };

  if (!open) return null;

  const displayRating = hoverRating || rating;
  const levelColor = getRatingColor(Math.ceil(displayRating));

  const placeholders = isWatchedList
    ? ['记录一下看完的感受...', '分享你的观后感...']
    : ['想看的理由...', '为什么想看这部...'];
  const placeholder = placeholders[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border flex flex-col"
        style={{maxHeight: '75vh'}}>

        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 border-border" >
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground" >{isWatchedList ? '编辑评价' : '备注'}</h3>
            {movieTitle && <p className="text-xs mt-0.5 truncate text-muted-foreground" >{movieTitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 text-muted-foreground" >✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {isWatchedList && (
            <div>
              <label className="block text-sm font-medium mb-3 text-secondary-foreground" >评分</label>
              {/* 10 stars with touch support */}
              <div ref={starsRef}
                className="flex items-center justify-center gap-0.5 cursor-pointer select-none touch-none"
                onClick={handleClick} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverRating(0)}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const fillRatio = Math.max(0, Math.min(1, displayRating - i * 0.5 * 2));
                  // Simplified: star i is fully filled if displayRating >= (i+1), partially if between i and i+1
                  const starFill = Math.max(0, Math.min(1, displayRating / 2 - i));
                  const clipId = `note-clip-${i}`;
                  return (
                    <svg key={i} width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <defs>
                        <clipPath id={clipId}>
                          <rect x="0" y="0" width={starFill * 24} height="24" />
                        </clipPath>
                      </defs>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        fill="none" stroke={levelColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      {starFill > 0 && (
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                          fill={levelColor} stroke={levelColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          clipPath={`url(#${clipId})`} />
                      )}
                    </svg>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-bold tabular-nums text-muted-foreground" style={{ color: displayRating > 0 ? levelColor : undefined, minWidth: '2.5rem', textAlign: 'center' }}>
                  {displayRating > 0 ? displayRating.toFixed(1) : '-'}
                </span>
                {displayRating >= 0.5 && (
                  <span className="text-sm px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${levelColor}15`, color: levelColor }}>
                    {getRatingLabel(displayRating)}
                  </span>
                )}
              </div>
              <p className="text-center text-[10px] mt-1 text-muted-foreground" >点击或滑动选择（支持半星，满分10.0）</p>
              {rating > 0 && <button onClick={() => setRating(0)} className="block mx-auto text-xs mt-1 text-muted-foreground" >清除评分</button>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-secondary-foreground" >{isWatchedList ? '感想' : '备注'}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} rows={4} maxLength={500}
              className="w-full px-4 py-3 rounded-lg text-sm border outline-none resize-none"
               />
            <div className="flex justify-end mt-1 text-muted-foreground"><span className="text-[10px]" >{note.length}/500</span></div>
          </div>
        </div>

        <div className="flex gap-3 justify-end px-5 py-4 border-t shrink-0 border-border" >
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary-foreground" >取消</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 bg-accent" >{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
