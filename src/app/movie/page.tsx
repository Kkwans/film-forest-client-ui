import MovieListClient from './MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('movie');

export default async function MoviePage() {
  const { items, total } = await fetchContentList('/api/movies');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="movie" apiBase="/api/movies" />;
}
