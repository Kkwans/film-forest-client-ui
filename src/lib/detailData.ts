import 'server-only';

import { cache } from 'react';
import { getContentTypeConfig, parseJsonArr, type ContentType } from './contentConstants';
import { cleanStoryline, parseRegion } from './utils';

export interface SharedDetailItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string;
  rating?: number;
  ratingImdb?: number;
  ratingRT?: number;
  summary: string;
  status?: string;
  totalEpisode?: number;
  currentEpisode?: number;
  duration?: number;
  genre?: string[];
  director?: string[];
  actor?: string[];
  language?: string[];
  updatedAt?: string;
}

const BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const getContentDetail = cache(async (contentType: ContentType, id: number): Promise<SharedDetailItem | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const config = getContentTypeConfig(contentType);
  const response = await fetch(`${BASE_URL}${config.apiPath}/${id}`, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`详情请求失败: ${response.status}`);
  const payload = await response.json() as { code?: number; message?: string; data?: Record<string, unknown> };
  const item = payload.data;
  if (!item?.id) {
    if (payload.message?.includes('不存在')) return null;
    throw new Error(payload.message || '详情响应缺少数据');
  }

  const totalEpisode = Number(item.totalEpisode) || undefined;
  const currentEpisode = Number(item.currentEpisode) || undefined;
  const episodeStatus = contentType === 'movie'
    ? undefined
    : totalEpisode && currentEpisode && currentEpisode < totalEpisode ? '更新中' : totalEpisode ? '已完结' : undefined;

  return {
    id: Number(item.id),
    title: String(item.title || ''),
    cover: String(item.posterUrl || ''),
    year: Number(item.year || 0),
    region: parseRegion(item.region as string).join(' / '),
    rating: Number(item.scoreDouban) || undefined,
    ratingImdb: Number(item.scoreImdb) || undefined,
    ratingRT: Number(item.scoreRt) || undefined,
    summary: cleanStoryline(String(item.storyline || '')),
    status: episodeStatus,
    totalEpisode,
    currentEpisode,
    duration: Number(item.duration) || undefined,
    genre: parseJsonArr(item.genre as string | string[] | undefined),
    director: parseJsonArr(item.director as string | string[] | undefined),
    actor: parseJsonArr(item.actor as string | string[] | undefined),
    language: parseJsonArr(item.language as string | string[] | undefined),
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  };
});
