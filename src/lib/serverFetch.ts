// 服务端数据获取工具 - 统一列表页 SSR 数据加载逻辑
// 所有列表页（movie/drama/variety/anime/short）共用此函数

import { parseRegion, parseGenre } from './utils';

export interface ContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string;
  rating?: number;
  genre?: string[];
  duration?: number;
  episodes?: number;
}

export interface FetchResult {
  items: ContentItem[];
  total: number;
}

/**
 * 服务端获取内容列表（SSR）
 * @param apiPath API 路径，如 '/api/movies'
 * @param options 可选参数
 */
export async function fetchContentList(
  apiPath: string,
  options?: { size?: number }
): Promise<FetchResult> {
  const size = options?.size ?? 24;
  try {
    const res = await fetch(
      `http://localhost:8080${apiPath}?page=1&size=${size}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    const raw = data?.data?.records || [];
    return {
      items: raw.map((m: any) => ({
        id: m.id,
        title: m.title,
        cover: m.posterUrl || m.cover || '',
        year: m.year || 0,
        region: parseRegion(m.region),
        rating: m.scoreDouban || m.scoreImdb || undefined,
        genre: parseGenre(m.genre),
        duration: m.duration || undefined,
        episodes: m.totalEpisode || m.currentEpisode || undefined,
      })),
      total: data?.data?.total || 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
}
