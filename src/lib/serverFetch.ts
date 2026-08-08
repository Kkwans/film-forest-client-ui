import 'server-only';

import { getContentTypeConfig, type ContentType } from './contentConstants';
import {
  toContentListSearchParams,
  type ContentListQuery,
} from './contentListQuery';
import { parseGenre, parseRegion } from './utils';

export { parseContentListQuery } from './contentListQuery';
export type { ContentListQuery, RawSearchParams } from './contentListQuery';

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
  error: boolean;
}

export async function fetchContentList(
  contentType: ContentType,
  query: ContentListQuery,
): Promise<FetchResult> {
  const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const config = getContentTypeConfig(contentType);
  try {
    const response = await fetch(
      `${baseUrl}${config.apiPath}?${toContentListSearchParams(query).toString()}`,
      { cache: 'no-store' },
    );
    if (!response.ok) throw new Error(`内容列表请求失败: ${response.status}`);
    const payload: unknown = await response.json();
    const data = (payload as { data?: { records?: Record<string, unknown>[]; total?: number } })?.data;
    const records = Array.isArray(data?.records) ? data.records : [];
    return {
      items: records.map((item) => ({
        id: Number(item.id),
        title: String(item.title || ''),
        cover: String(item.posterUrl || item.cover || ''),
        year: Number(item.year || 0),
        region: parseRegion(item.region as string).join(' / '),
        rating: Number(item.scoreDouban || item.scoreImdb) || undefined,
        genre: parseGenre(item.genre as string),
        duration: Number(item.duration) || undefined,
        episodes: Number(item.totalEpisode || item.currentEpisode) || undefined,
      })),
      total: Number(data?.total || 0),
      error: false,
    };
  } catch {
    return { items: [], total: 0, error: true };
  }
}
