// @ts-nocheck
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export default async function AnimePage() {
  const { items, total } = await fetchContentList('/api/animes');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="anime" apiBase="/api/animes" />;
}
