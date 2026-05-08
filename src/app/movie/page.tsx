// @ts-nocheck
import MovieListClient from './MovieListClient';
import { parseRegion, parseGenre } from '@/lib/utils';

async function fetchMovies() {
  try {
    const res = await fetch('http://localhost:8080/api/movies?page=1&size=24', { cache: 'no-store' });
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

export default async function MoviePage() {
  const { items, total } = await fetchMovies();
  return <MovieListClient initialItems={items} initialTotal={total} contentType="movie" apiBase="/api/movies" />;
}
