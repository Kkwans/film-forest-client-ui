// @ts-nocheck
import MovieListClient from '../movie/MovieListClient';
import { parseRegion, parseGenre } from '@/lib/utils';

async function fetchItems(apiPath: string) {
  try {
    const res = await fetch(`http://localhost:8080${apiPath}?page=1&size=24`, { cache: 'no-store' });
    const data = await res.json();
    const raw = data?.data?.records || [];
    return {
      items: raw.map((m: any) => ({
        id: m.id, title: m.title, cover: m.posterUrl || '', year: m.year || 0,
        region: parseRegion(m.region),
        rating: m.scoreDouban || m.scoreImdb || undefined,
        genre: parseGenre(m.genre),
      })),
      total: data?.data?.total || 0,
    };
  } catch { return { items: [], total: 0 }; }
}

export default async function AnimePage() {
  const { items, total } = await fetchItems('/api/animes');
  return <MovieListClient initialItems={items} initialTotal={total} contentType="anime" apiBase="/api/animes" />;
}
