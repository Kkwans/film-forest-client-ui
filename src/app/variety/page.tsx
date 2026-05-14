// @ts-nocheck
import MovieListClient from '../movie/MovieListClient';
import { fetchContentList } from '@/lib/serverFetch';

export default async function VarietyPage() {
  const { items, total } = await fetchContentList('/api/varieties');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="variety" apiBase="/api/varieties" />;
}
