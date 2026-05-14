// @ts-nocheck
import MovieListClient from './MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export default async function MoviePage() {
  const { items, total } = await fetchContentList('/api/movies');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="movie" apiBase="/api/movies" />;
}
