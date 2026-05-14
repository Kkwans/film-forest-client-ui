// @ts-nocheck
import type { Metadata } from 'next';
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export const metadata: Metadata = {
  title: '电视剧 - 影视森林',
  description: '热播剧集资源，提供评分、磁力链接、网盘资源下载。',
};

export default async function DramaPage() {
  const { items, total } = await fetchContentList('/api/dramas');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="drama" apiBase="/api/dramas" />;
}
