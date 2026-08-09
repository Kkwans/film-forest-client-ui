'use client';

import { useId } from 'react';
import { Slider } from '@base-ui/react/slider';
import { Star } from 'lucide-react';

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

export default function RatingField({ value, onChange, readOnly = false }: {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}) {
  const labelId = useId();
  const level = value > 0 ? ratingLevel(value) : null;

  return (
    <section aria-labelledby={labelId}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id={labelId} className="text-sm font-semibold text-foreground">我的评分</h3>
          {!readOnly && <p className="mt-1 text-xs text-muted-foreground">支持 0.5 分步进，使用方向键也可调整。</p>}
        </div>
        <div className="flex min-w-20 items-center justify-end gap-1.5">
          <Star aria-hidden className="h-4 w-4 fill-amber-500 text-amber-500" />
          <span className="text-2xl font-bold tabular-nums text-foreground">{value > 0 ? value.toFixed(1) : '—'}</span>
        </div>
      </div>

      {readOnly ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium" style={{ color: level?.color }}>{level?.label || '暂未评分'}</p>
        </div>
      ) : (
        <Slider.Root value={value} onValueChange={onChange} min={0} max={10} step={0.5} className="mt-5 w-full">
          <Slider.Control className="flex h-10 w-full touch-none items-center">
            <Slider.Track className="relative h-2 w-full rounded-full bg-muted">
              <Slider.Indicator className="absolute rounded-full bg-accent" />
              <Slider.Thumb
                className="size-5 rounded-full border-2 border-accent bg-card shadow-md outline-none ring-accent/20 transition-shadow focus-visible:ring-4"
                getAriaLabel={() => '我的评分'}
                getAriaValueText={(_, rating) => `${rating.toFixed(1)} 分`}
              />
            </Slider.Track>
          </Slider.Control>
          <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
            {[0, 2, 4, 6, 8, 10].map((rating) => <span key={rating}>{rating}</span>)}
          </div>
          <p className="mt-3 min-h-5 text-center text-sm font-medium" style={{ color: level?.color }} aria-live="polite">
            {level?.label || '拖动滑块选择评分'}
          </p>
        </Slider.Root>
      )}
    </section>
  );
}
