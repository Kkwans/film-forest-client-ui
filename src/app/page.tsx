import HomeClient, { type HomeContentItem } from './HomeClient';
import { getListMetadata } from '@/lib/metadata';
import { parseGenre, parseRegion } from '@/lib/utils';

export const metadata = getListMetadata('home');
export const revalidate = 600;

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

const BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function mapGroup(group: Record<string, RecommendItem[]> | undefined): Record<string, HomeContentItem[]> {
  return Object.fromEntries(Object.entries(group || {}).map(([type, items]) => [
    type,
    items.map((item) => ({
      id: item.id,
      title: item.title,
      cover: item.posterUrl || '',
      year: item.year || 0,
      region: parseRegion(item.region),
      rating: item.scoreDouban || undefined,
      genre: parseGenre(item.genre),
      episodes: item.totalEpisode || undefined,
    })),
  ]));
}

async function fetchHome(): Promise<{ hot: Record<string, HomeContentItem[]>; latest: Record<string, HomeContentItem[]>; error: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/api/recommend?topN=12`, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`首页聚合请求失败: ${response.status}`);
    const payload = await response.json() as { data?: RecommendData };
    return { hot: mapGroup(payload.data?.hot), latest: mapGroup(payload.data?.latest), error: false };
  } catch {
    return { hot: {}, latest: {}, error: true };
  }
}

export default async function HomePage() {
  const home = await fetchHome();
  return <HomeClient hot={home.hot} latest={home.latest} error={home.error} />;
}
