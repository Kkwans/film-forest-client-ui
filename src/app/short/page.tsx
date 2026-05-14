// @ts-nocheck
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export default async function ShortPage() {
  const { items, total } = await fetchContentList('/api/short-dramas');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="short" apiBase="/api/short-dramas" />;
}
