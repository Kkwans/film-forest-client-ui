'use client';

import { useId } from 'react';
import { Slider } from '@base-ui/react/slider';
import { Star } from 'lucide-react';
import { fractionalStarFill } from '@/lib/uiContracts';

const RATING_LEVELS = [
  { max: 2, label: '不推荐', color: 'var(--rating-low)' },
  { max: 4, label: '较一般', color: 'var(--rating-low)' },
  { max: 6, label: '还不错', color: 'var(--rating-6)' },
  { max: 8, label: '很喜欢', color: 'var(--rating-7)' },
  { max: 10, label: '强烈推荐', color: 'var(--rating-9)' },
];

function ratingLevel(rating: number) {
  return RATING_LEVELS.find((level) => rating <= level.max) || RATING_LEVELS[RATING_LEVELS.length - 1];
}

function FractionalStars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${score.toFixed(1)} 分，${(score / 2).toFixed(2)} 星`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className="relative inline-flex h-4 w-4">
          <Star aria-hidden className="absolute inset-0 h-4 w-4" strokeWidth={1.5} />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fractionalStarFill(score, index) * 100}%` }}>
            <Star aria-hidden className="h-4 w-4 max-w-none fill-current" strokeWidth={1.5} />
          </span>
        </span>
      ))}
    </span>
  );
}

export default function RatingField({ value, onChange, readOnly = false }: {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}) {
  const labelId = useId();
  const level = value > 0 ? ratingLevel(value) : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby={labelId}>
      <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-accent/10 via-accent/[0.03] to-transparent p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">My rating</p>
          <h3 id={labelId} className="mt-1 text-base font-semibold text-foreground">我的评分</h3>
          {!readOnly && <p className="mt-1 text-xs leading-5 text-muted-foreground">评分和观后感都可以留空，只标记看过也可以。</p>}
        </div>
        <div className="shrink-0 rounded-xl border border-accent/15 bg-card/80 px-3 py-2 text-right shadow-sm">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-3xl font-black leading-none tabular-nums text-foreground">{value > 0 ? value.toFixed(1) : '—'}</span>
            <span className="text-xs font-medium text-muted-foreground">/ 10</span>
          </div>
          {value > 0 && <div className="mt-1 flex justify-end"><FractionalStars score={value} /></div>}
        </div>
      </div>

      <div className="border-t border-border p-4 sm:p-5">
        {readOnly ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/35 px-3.5 py-3">
            <span className="text-sm font-medium" style={{ color: level?.color }}>{level?.label || '暂未评分'}</span>
            {value > 0 && <span className="text-xs text-muted-foreground">可点击“编辑评价”修改</span>}
          </div>
        ) : (
          <Slider.Root value={value} onValueChange={onChange} min={0} max={10} step={0.5} className="w-full">
            <Slider.Control className="flex h-10 w-full touch-none items-center">
              <Slider.Track className="relative h-2 w-full rounded-full bg-muted">
                <Slider.Indicator className="absolute rounded-full bg-accent" />
                <Slider.Thumb
                  className="size-5 rounded-full border-2 border-accent bg-card shadow-md outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent/30"
                  getAriaLabel={() => '我的评分'}
                  getAriaValueText={(_, rating) => `${rating.toFixed(1)} 分`}
                />
              </Slider.Track>
            </Slider.Control>
            <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
              {[0, 2, 4, 6, 8, 10].map((rating) => <span key={rating}>{rating}</span>)}
            </div>
            <p className="mt-3 min-h-5 text-center text-sm font-semibold" style={{ color: level?.color }} aria-live="polite">
              {level?.label || '拖动滑块选择评分'}
            </p>
          </Slider.Root>
        )}
      </div>
    </section>
  );
}
