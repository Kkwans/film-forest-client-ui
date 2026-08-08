/** 五类内容、观看状态与脏 JSON 字段的共享定义。 */

export interface StatusIconConfig {
  icon: string;
  label: string;
  color: string;
  fill: boolean;
}

export const STATUS_ICONS: Record<string, StatusIconConfig> = {
  watched: {
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    label: '看过',
    color: 'var(--status-watched)',
    fill: true,
  },
  watching: {
    icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    label: '在看',
    color: 'var(--status-watching)',
    fill: false,
  },
  want_to_watch: {
    icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    label: '想看',
    color: 'var(--status-want)',
    fill: true,
  },
  custom: {
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    label: '已收藏',
    color: 'var(--status-custom)',
    fill: true,
  },
};

export function getStatusConfig(listType: string | undefined): StatusIconConfig | null {
  if (!listType) return null;
  return STATUS_ICONS[listType] || STATUS_ICONS.custom;
}

export const CONTENT_TYPE_REGISTRY = {
  movie: {
    code: 'movie', route: 'movie', apiPath: '/api/movies', label: '电影', metadataKey: 'movie',
  },
  drama: {
    code: 'drama', route: 'drama', apiPath: '/api/dramas', label: '电视剧', metadataKey: 'drama',
  },
  variety: {
    code: 'variety', route: 'variety', apiPath: '/api/varieties', label: '综艺', metadataKey: 'variety',
  },
  anime: {
    code: 'anime', route: 'anime', apiPath: '/api/animes', label: '动漫', metadataKey: 'anime',
  },
  short_drama: {
    code: 'short_drama', route: 'short', apiPath: '/api/short-dramas', label: '短剧', metadataKey: 'short',
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPE_REGISTRY;
export type ContentTypeConfig = (typeof CONTENT_TYPE_REGISTRY)[ContentType];

const CONTENT_TYPE_ALIASES: Record<string, ContentType> = {
  movie: 'movie',
  drama: 'drama',
  variety: 'variety',
  anime: 'anime',
  short: 'short_drama',
  short_drama: 'short_drama',
  'short-drama': 'short_drama',
};

export function normalizeContentType(value: string): ContentType {
  return CONTENT_TYPE_ALIASES[value] || 'movie';
}

export function getContentTypeConfig(value: string): ContentTypeConfig {
  return CONTENT_TYPE_REGISTRY[normalizeContentType(value)];
}

/** 兼容现有展示组件；值由 registry 派生，不再维护第二份映射。 */
export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(CONTENT_TYPE_REGISTRY).map((config) => [config.code, config.label]),
);

export const TYPE_HREFS: Record<string, string> = Object.fromEntries(
  Object.values(CONTENT_TYPE_REGISTRY).map((config) => [config.code, `/${config.route}`]),
);

/** 容忍后端历史脏字段：合法数组直接返回，JSON 非数组或损坏时安全降级为空。 */
export function parseJsonArr(val: string | string[] | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((item): item is string => typeof item === 'string');
  try {
    const parsed: unknown = JSON.parse(val);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
