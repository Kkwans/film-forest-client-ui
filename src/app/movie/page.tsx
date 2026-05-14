// @ts-nocheck
import type { Metadata } from 'next';
import MovieListClient from './MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export const metadata: Metadata = {
  title: '电影 - 影视森林',
  description: '最新最热电影资源，提供豆瓣/IMDB/烂番茄评分、磁力链接、网盘资源下载。',
};

export default async function MoviePage() {
  const { items, total } = await fetchContentList('/api/movies');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="movie" apiBase="/api/movies" />;
}
