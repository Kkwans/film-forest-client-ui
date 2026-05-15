import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('anime');

export default async function AnimePage() {
  const { items, total } = await fetchContentList('/api/animes');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="anime" apiBase="/api/animes" />;
}
