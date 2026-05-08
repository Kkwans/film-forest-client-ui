// @ts-nocheck
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import HomeClient from './HomeClient';
import { parseRegion, parseGenre } from '@/lib/utils';

interface ContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string | string[];
  rating?: number;
  genre?: string[];
  status?: string;
  episodes?: number;
  duration?: number;
}

function mapItem(m: any, type: string): ContentItem {
  return {
    id: m.id,
    title: m.title,
    cover: m.posterUrl || m.cover || '',
    year: m.year || 0,
    region: parseRegion(m.region),
    rating: m.scoreDouban || m.scoreImdb || undefined,
    genre: parseGenre(m.genre),
    status: m.status === 1 ? '在映' : undefined,
    episodes: m.totalEpisode || m.episodes || undefined,
    duration: m.duration || undefined,
  };
}

async function fetchItems(url: string): Promise<ContentItem[]> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    const raw = data?.data?.records || data?.data || [];
    return raw.map((m: any) => mapItem(m, ''));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [movies, dramas, varieties, animes, shorts] = await Promise.all([
    fetchItems('http://localhost:8080/api/movies?page=1&size=12'),
    fetchItems('http://localhost:8080/api/dramas?page=1&size=12'),
    fetchItems('http://localhost:8080/api/varieties?page=1&size=12'),
    fetchItems('http://localhost:8080/api/animes?page=1&size=12'),
    fetchItems('http://localhost:8080/api/short-dramas?page=1&size=12'),
  ]);

  return (
    <HomeClient
      initialMovies={movies}
      initialDramas={dramas}
      initialVarieties={varieties}
      initialAnimes={animes}
      initialShorts={shorts}
    />
  );
}
