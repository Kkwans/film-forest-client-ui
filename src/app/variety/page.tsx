// @ts-nocheck
import type { Metadata } from 'next';
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export const metadata: Metadata = {
  title: '综艺 - 影视森林',
  description: '热门综艺节目资源，提供评分、磁力链接、网盘资源下载。',
};

export default async function VarietyPage() {
  const { items, total } = await fetchContentList('/api/varieties');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="variety" apiBase="/api/varieties" />;
}
