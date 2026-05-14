// @ts-nocheck
import type { Metadata } from 'next';
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export const metadata: Metadata = {
  title: '动漫 - 影视森林',
  description: '精彩动漫资源，提供评分、磁力链接、网盘资源下载。',
};

export default async function AnimePage() {
  const { items, total } = await fetchContentList('/api/animes');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="anime" apiBase="/api/animes" />;
}
