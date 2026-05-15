import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('short');

export default async function ShortPage() {
  const { items, total } = await fetchContentList('/api/short-dramas');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="short" apiBase="/api/short-dramas" />;
}
