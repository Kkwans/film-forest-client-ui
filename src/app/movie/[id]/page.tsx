import Link from 'next/link';
import MovieDetailClient from './MovieDetailClient';
import { parseRegion, parseGenre } from '@/lib/utils';
import { getDetailMetadata } from '@/lib/metadata';

// ISR: 电影详情页每小时重新验证
export const revalidate = 3600;

const BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchMovie(id: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/movies/${id}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const m = data?.data;
    if (!m || !m.id) return null;
    return {
      id: m.id, title: m.title, cover: m.posterUrl || '', year: m.year || 0,
      region: parseRegion(m.region).join(' / '),
      rating: m.scoreDouban, ratingImdb: m.scoreImdb, ratingRT: m.scoreRt,
      summary: m.storyline || '',
      genre: parseGenre(m.genre),
      director: Array.isArray(m.director) ? m.director : (m.director ? JSON.parse(m.director) : []),
      writer: Array.isArray(m.writer) ? m.writer : (m.writer ? JSON.parse(m.writer) : []),
      actor: Array.isArray(m.actor) ? m.actor : (m.actor ? JSON.parse(m.actor) : []),
      language: Array.isArray(m.language) ? m.language : (m.language ? [m.language] : []),
      duration: m.duration, releaseDate: m.releaseDate,
      aka: Array.isArray(m.alias) ? m.alias : (m.alias ? JSON.parse(m.alias) : []),
      updatedAt: m.updatedAt,
    };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await fetchMovie(Number(id));
  return getDetailMetadata('movie', movie, 'summary');
}

async function fetchResources(type: string, contentId: number) {
  try {
    const [magnetRes, cloudRes, onlineRes] = await Promise.all([
      fetch(`${BASE_URL}/api/resources/magnet?contentType=${type}&contentId=${contentId}`, { next: { revalidate: 3600 } }),
      fetch(`${BASE_URL}/api/resources/cloud?contentType=${type}&contentId=${contentId}`, { next: { revalidate: 3600 } }),
      fetch(`${BASE_URL}/api/resources/online?contentType=${type}&contentId=${contentId}`, { next: { revalidate: 3600 } }),
    ]);
    const magnetData = await magnetRes.json();
    const cloudData = await cloudRes.json();
    const onlineData = await onlineRes.json();
    return {
      magnets: magnetData?.data || [],
      clouds: cloudData?.data || [],
      onlines: onlineData?.data || [],
    };
  } catch { return { magnets: [], clouds: [], onlines: [] }; }
}

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const movie = await fetchMovie(id);
  const { magnets, clouds, onlines } = await fetchResources('movie', id);

  if (!movie) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🎬</p>
        <p className="text-lg font-medium text-foreground mb-2">电影不存在</p>
        <p className="text-sm text-muted-foreground mb-6">抱歉，您查找的内容暂时不可用</p>
        <Link href="/movie" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors shadow-sm">← 返回电影列表</Link>
      </div>
    );
  }

  return <MovieDetailClient movie={movie} magnetResources={magnets} cloudResources={clouds} onlineResources={onlines} />;
}
