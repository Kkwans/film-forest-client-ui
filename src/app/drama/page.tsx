import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('drama');

export default async function DramaPage() {
  const { items, total } = await fetchContentList('/api/dramas');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="drama" apiBase="/api/dramas" />;
}
