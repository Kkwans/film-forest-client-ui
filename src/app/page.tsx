import HomeClient from './HomeClient';
import { parseRegion, parseGenre } from '@/lib/utils';
import { getListMetadata } from '@/lib/metadata';

export const metadata = getListMetadata('home');

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

interface FetchResult {
  items: ContentItem[];
  error: boolean;
}

async function fetchItems(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { items: [], error: true };
    const data = await res.json();
    const raw = data?.data?.records || data?.data || [];
    return { items: raw.map((m: any) => mapItem(m, '')), error: false };
  } catch {
    return { items: [], error: true };
  }
}

/** 推荐数据类型 */
interface RecommendItem {
  id: number;
  type: string;
  title: string;
  posterUrl?: string;
  year?: number;
  scoreDouban?: number;
  genre?: string;
  region?: string;
  totalEpisode?: number;
}

interface RecommendData {
  hot: Record<string, RecommendItem[]>;
  latest: Record<string, RecommendItem[]>;
}

function mapRecommendItem(m: RecommendItem): ContentItem {
  return {
    id: m.id,
    title: m.title,
    cover: m.posterUrl || '',
    year: m.year || 0,
    region: parseRegion(m.region),
    rating: m.scoreDouban || undefined,
    genre: parseGenre(m.genre),
    episodes: m.totalEpisode || undefined,
  };
}

async function fetchRecommend(): Promise<{ hot: Record<string, ContentItem[]>; latest: Record<string, ContentItem[]>; error: boolean }> {
  try {
    const res = await fetch('http://localhost:8080/api/recommend?topN=6', { cache: 'no-store' });
    if (!res.ok) return { hot: {}, latest: {}, error: true };
    const json = await res.json();
    const data: RecommendData = json?.data;
    if (!data) return { hot: {}, latest: {}, error: true };

    const mapGroup = (group: Record<string, RecommendItem[]>): Record<string, ContentItem[]> => {
      const result: Record<string, ContentItem[]> = {};
      for (const [type, items] of Object.entries(group)) {
        result[type] = items.map(mapRecommendItem);
      }
      return result;
    };

    return { hot: mapGroup(data.hot), latest: mapGroup(data.latest), error: false };
  } catch {
    return { hot: {}, latest: {}, error: true };
  }
}

export default async function HomePage() {
  const [movies, dramas, varieties, animes, shorts, recommend] = await Promise.all([
    fetchItems('http://localhost:8080/api/movies?page=1&size=12'),
    fetchItems('http://localhost:8080/api/dramas?page=1&size=12'),
    fetchItems('http://localhost:8080/api/varieties?page=1&size=12'),
    fetchItems('http://localhost:8080/api/animes?page=1&size=12'),
    fetchItems('http://localhost:8080/api/short-dramas?page=1&size=12'),
    fetchRecommend(),
  ]);

  return (
    <HomeClient
      initialMovies={movies.items}
      initialDramas={dramas.items}
      initialVarieties={varieties.items}
      initialAnimes={animes.items}
      initialShorts={shorts.items}
      recommendHot={recommend.hot}
      recommendLatest={recommend.latest}
      errors={{
        movies: movies.error,
        dramas: dramas.error,
        varieties: varieties.error,
        animes: animes.error,
        shorts: shorts.error,
        recommend: recommend.error,
      }}
    />
  );
}
