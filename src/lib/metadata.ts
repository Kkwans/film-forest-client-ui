import type { Metadata } from 'next';

// ==================== 站点级常量 ====================

/** 站点名称 */
export const SITE_NAME = '影视森林';

/** 标题后缀（自动拼接） */
const TITLE_SUFFIX = ` - ${SITE_NAME}`;

// ==================== 列表页静态 Metadata ====================

/** 列表页 key → 配置映射 */
const LIST_PAGE_CONFIG: Record<
  string,
  { title: string; description: string; ogType?: string }
> = {
  home: {
    title: `${SITE_NAME} - 影视资源聚合平台`,
    description:
      '影视森林汇集最新电影、电视剧、综艺、动漫、短剧资源，提供豆瓣/IMDB评分、磁力链接、网盘资源一站式聚合服务。',
    ogType: 'website',
  },
  movie: {
    title: `电影${TITLE_SUFFIX}`,
    description: '最新最热电影资源，提供豆瓣/IMDB/烂番茄评分、磁力链接、网盘资源下载。',
  },
  drama: {
    title: `电视剧${TITLE_SUFFIX}`,
    description: '热播剧集资源，提供评分、磁力链接、网盘资源下载。',
  },
  variety: {
    title: `综艺${TITLE_SUFFIX}`,
    description: '热门综艺节目资源，提供评分、磁力链接、网盘资源下载。',
  },
  anime: {
    title: `动漫${TITLE_SUFFIX}`,
    description: '精彩动漫资源，提供评分、磁力链接、网盘资源下载。',
  },
  short: {
    title: `短剧${TITLE_SUFFIX}`,
    description: '短剧速看资源，提供评分、磁力链接、网盘资源下载。',
  },
};

/** 获取列表页的 Metadata（供 page.tsx 直接 export） */
export function getListMetadata(key: string): Metadata {
  const config = LIST_PAGE_CONFIG[key];
  if (!config) return { title: SITE_NAME };

  const meta: Metadata = {
    title: config.title,
    description: config.description,
  };

  if (config.ogType) {
    meta.openGraph = {
      title: config.title,
      description: config.description,
      type: config.ogType as 'website' | 'article',
    };
  }

  return meta;
}

// ==================== 详情页动态 Metadata ====================

/** 内容类型配置 */
const DETAIL_TYPE_CONFIG: Record<
  string,
  { label: string; ogType: string; notFoundTitle: string }
> = {
  movie: {
    label: '电影',
    ogType: 'video.movie',
    notFoundTitle: '电影未找到',
  },
  drama: {
    label: '电视剧',
    ogType: 'video.tv_show',
    notFoundTitle: '剧集未找到',
  },
  variety: {
    label: '综艺',
    ogType: 'video.tv_show',
    notFoundTitle: '综艺未找到',
  },
  anime: {
    label: '动漫',
    ogType: 'video.other',
    notFoundTitle: '动漫未找到',
  },
  short: {
    label: '短剧',
    ogType: 'video.other',
    notFoundTitle: '短剧未找到',
  },
};

interface DetailItem {
  title: string;
  year?: number | string;
  summary?: string;
  storyline?: string;
  cover?: string;
}

/**
 * 生成详情页的 Metadata
 * @param type 内容类型（movie/drama/variety/anime/short）
 * @param item 数据对象（fetch 结果）
 * @param descriptionKey 优先取哪个字段做描述（默认 'storyline'）
 */
export function getDetailMetadata(
  type: string,
  item: DetailItem | null | undefined,
  descriptionKey: 'storyline' | 'summary' = 'storyline',
): Metadata {
  const config = DETAIL_TYPE_CONFIG[type];
  if (!config) return { title: SITE_NAME };
  if (!item) return { title: `${config.notFoundTitle}${TITLE_SUFFIX}` };

  const desc = (item[descriptionKey] || item.summary || item.storyline || '')
    .slice(0, 160) || `${item.title}(${item.year ?? ''}) 评分、磁力链接、网盘资源下载。`;

  const title = `${item.title} - ${config.label}${TITLE_SUFFIX}`;

  const meta: Metadata = {
    title,
    description: desc,
    openGraph: {
      title: `${item.title} (${item.year ?? ''})`,
      description: desc,
      type: config.ogType as 'video.movie' | 'video.tv_show' | 'video.other',
    },
  };

  if (item.cover) {
    meta.openGraph!.images = [{ url: item.cover }];
  }

  return meta;
}
