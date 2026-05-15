/**
 * 内容展示共享常量和工具函数
 * 从 MovieCard / SearchPage / ListDetailPage 等多处提取的重复代码
 */

/* ============================================================
 * 1. 观看状态图标配置
 * 用于：MovieCard、SearchPage、ListDetailPage 等所有展示"想看/在看/看过"状态的场景
 * ============================================================ */

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

/** 根据 listType 获取状态图标配置 */
export function getStatusConfig(listType: string | undefined): StatusIconConfig | null {
  if (!listType) return null;
  return STATUS_ICONS[listType] || STATUS_ICONS.custom;
}

/* ============================================================
 * 2. 内容类型标签映射
 * 用于：SearchPage、ListDetailPage 等展示内容类型的场景
 * ============================================================ */

export const TYPE_LABELS: Record<string, string> = {
  movie: '电影',
  drama: '电视剧',
  variety: '综艺',
  anime: '动漫',
  short_drama: '短剧',
};

export const TYPE_HREFS: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

/* ============================================================
 * 3. JSON 数组解析工具
 * 用于：解析后端返回的 JSON 字符串数组字段（genre/director/actor/region 等）
 * ============================================================ */

export function parseJsonArr(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
