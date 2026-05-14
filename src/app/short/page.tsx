// @ts-nocheck
import type { Metadata } from 'next';
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export const metadata: Metadata = {
  title: '短剧 - 影视森林',
  description: '短剧速看资源，提供评分、磁力链接、网盘资源下载。',
};

export default async function ShortPage() {
  const { items, total } = await fetchContentList('/api/short-dramas');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="short" apiBase="/api/short-dramas" />;
}
