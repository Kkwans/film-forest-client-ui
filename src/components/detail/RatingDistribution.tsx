'use client';

/**
 * 评分分布组件
 * 展示豆瓣 / IMDB / 烂番茄 三个平台的评分对比柱状图
 * 纯 CSS 实现，无需额外图表库
 */

interface RatingItem {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  bgColor: string;
  displayValue: string;
}

export default function RatingDistribution({
  douban,
  imdb,
  rt,
}: {
  douban?: number | null;
  imdb?: number | null;
  rt?: number | null;
}) {
  const ratings: RatingItem[] = [
    douban != null
      ? {
          label: '豆瓣',
          value: douban,
          maxValue: 10,
          color: '#e09015',
          bgColor: 'var(--badge-douban-bg, #fef3e2)',
          displayValue: douban.toFixed(1),
        }
      : null,
    imdb != null
      ? {
          label: 'IMDB',
          value: imdb,
          maxValue: 10,
          color: '#f5c518',
          bgColor: 'var(--badge-imdb-bg, #f5f0d0)',
          displayValue: imdb.toFixed(1),
        }
      : null,
    rt != null
      ? {
          label: '烂番茄',
          value: rt,
          maxValue: 100,
          color: '#fa320a',
          bgColor: 'var(--badge-rt-bg, #fde8e4)',
          displayValue: `${rt}%`,
        }
      : null,
  ].filter((r): r is RatingItem => r !== null);

  if (ratings.length === 0) return null;

  return (
    <section className="rounded-xl p-5 border">
      <h2 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        评分对比
      </h2>
      <div className="space-y-4">
        {ratings.map((r) => {
          const percent = (r.value / r.maxValue) * 100;
          return (
            <div key={r.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="font-bold" style={{ color: r.color }}>
                  {r.displayValue}
                </span>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden shadow-inner"
                style={{ backgroundColor: r.bgColor }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: r.color,
                    minWidth: percent > 0 ? '1.5rem' : '0',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        豆瓣和 IMDB 满分 10 分，烂番茄满分 100%
      </p>
    </section>
  );
}
