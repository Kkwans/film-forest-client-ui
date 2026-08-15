import 'server-only';

import { cache } from 'react';
import { getContentTypeConfig, type ContentType } from './contentConstants';
import { mapDetailData, type SharedDetailItem } from './detailMapping';

export type { SharedDetailItem } from './detailMapping';

const BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const getContentDetail = cache(async (contentType: ContentType, id: number): Promise<SharedDetailItem | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const config = getContentTypeConfig(contentType);
  const response = await fetch(`${BASE_URL}${config.apiPath}/${id}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`详情请求失败: ${response.status}`);
  const payload = await response.json() as { code?: number; message?: string; data?: Record<string, unknown> };
  const item = payload.data;
  if (!item?.id) {
    if (payload.message?.includes('不存在')) return null;
    throw new Error(payload.message || '详情响应缺少数据');
  }

  return mapDetailData(item, contentType);
});
