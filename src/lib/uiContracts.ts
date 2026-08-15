export type PosterDisplayStatus = 'original' | 'tmdb' | 'fallback' | 'unavailable';

export interface PosterResolutionLike {
  posterUrl?: string | null;
  source?: string | null;
  matchStatus?: string | null;
  diagnosticCode?: string | null;
}

export interface PosterDisplay {
  url: string;
  status: PosterDisplayStatus;
  diagnosticCode?: string | null;
}

/**
 * 统一海报展示契约：TMDB 任何失败都保留来源站原图，不把失败误呈现为占位图。
 */
export function resolvePosterDisplay(
  originalUrl: string | null | undefined,
  resolution?: PosterResolutionLike | null,
  failed = false,
): PosterDisplay {
  const fallback = originalUrl || '/poster-placeholder.svg';
  if (failed) {
    return { url: fallback, status: 'unavailable' };
  }

  if (resolution?.source === 'tmdb' && resolution.posterUrl) {
    return {
      url: resolution.posterUrl,
      status: 'tmdb',
      diagnosticCode: resolution.diagnosticCode,
    };
  }

  if (resolution) {
    const diagnostic = `${resolution.matchStatus || ''} ${resolution.diagnosticCode || ''}`.toLowerCase();
    const isFailure = /fail|error|invalid|unavailable|timeout|not[_ -]?matched|rate[_ -]?limited/.test(diagnostic);
    return {
      url: fallback,
      status: isFailure ? 'fallback' : 'original',
      diagnosticCode: resolution.diagnosticCode,
    };
  }

  return { url: fallback, status: 'original' };
}

/**
 * 看过时间只输出相对日期，不泄露具体时分秒。
 */
export function formatWatchedAt(
  input: number | string | Date | null | undefined,
  now = Date.now(),
): string {
  if (input == null || input === '') return '--';
  const timestamp = input instanceof Date
    ? input.getTime()
    : typeof input === 'number'
      ? input
      : new Date(input).getTime();
  if (!Number.isFinite(timestamp)) return '--';

  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;

  const currentDate = dateInShanghai(now);
  const watchedDate = dateInShanghai(timestamp);
  const sameDay = currentDate.year === watchedDate.year
    && currentDate.month === watchedDate.month
    && currentDate.day === watchedDate.day;
  if (sameDay) return `${Math.floor(diff / hour)}小时前`;

  const elapsedDays = Math.max(1, Math.floor(diff / day));
  if (elapsedDays < 7) return `${elapsedDays}天前`;
  return `${watchedDate.year}年${watchedDate.month}月${watchedDate.day}日`;
}

function dateInShanghai(timestamp: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(timestamp));
  const value = (type: 'year' | 'month' | 'day') => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

/** score 为十分制，starIndex 为从 0 开始的五星索引。 */
export function fractionalStarFill(score: number | null | undefined, starIndex: number): number {
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.min(10, Number(score))) : 0;
  const normalizedIndex = Math.max(0, Math.floor(starIndex));
  return Math.max(0, Math.min(1, normalizedScore / 2 - normalizedIndex));
}

export type GenreColorToken =
  | 'action'
  | 'comedy'
  | 'drama'
  | 'romance'
  | 'horror'
  | 'thriller'
  | 'erotic'
  | 'scifi'
  | 'fantasy'
  | 'documentary'
  | 'animation'
  | 'default';

/** 列表卡片的低饱和题材色；详情页不使用这组语义色。 */
export function getGenreColorToken(genre: string | null | undefined): GenreColorToken {
  const value = (genre || '').trim().toLocaleLowerCase('zh-CN');
  if (/动作|action/.test(value)) return 'action';
  if (/喜剧|comedy/.test(value)) return 'comedy';
  if (/剧情|drama/.test(value)) return 'drama';
  if (/爱情|浪漫|romance/.test(value)) return 'romance';
  if (/恐怖|horror/.test(value)) return 'horror';
  if (/惊悚|thriller/.test(value)) return 'thriller';
  if (/情色|erotic|成人/.test(value)) return 'erotic';
  if (/科幻|science fiction|sci-fi|scifi/.test(value)) return 'scifi';
  if (/奇幻|fantasy/.test(value)) return 'fantasy';
  if (/纪录|documentary/.test(value)) return 'documentary';
  if (/动画|anime|animation/.test(value)) return 'animation';
  return 'default';
}

export interface DiskResourceLike {
  diskType?: string | null;
}

export function filterResourcesByDiskType<T extends DiskResourceLike>(
  resources: T[],
  diskType?: string | null,
): T[] {
  const selected = diskType?.trim().toLocaleLowerCase('zh-CN');
  if (!selected || selected === 'all') return resources;
  return resources.filter((resource) => resource.diskType?.trim().toLocaleLowerCase('zh-CN') === selected);
}

export interface DoubleClickGuard {
  handle: () => void;
  dispose: () => void;
}

/** 将两次快速 click 合并为一次 double-click，避免单击副作用先于管理弹窗触发。 */
export function createSingleDoubleClickGuard(
  onSingle: () => void,
  onDouble: () => void,
  windowMs = 240,
  setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
): DoubleClickGuard {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    handle() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
        onDouble();
        return;
      }
      timer = setTimer(() => {
        timer = null;
        onSingle();
      }, windowMs);
    },
    dispose() {
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}
