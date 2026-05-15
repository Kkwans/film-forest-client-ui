import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('variety');

export default async function VarietyPage() {
  const { items, total } = await fetchContentList('/api/varieties');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="variety" apiBase="/api/varieties" />;
}
