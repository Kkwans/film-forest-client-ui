// @ts-nocheck
import Link from 'next/link';
import MovieDetailClient from './MovieDetailClient';
import { parseRegion, parseGenre } from '@/lib/utils';

async function fetchMovie(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/movies/${id}`, { cache: 'no-store' });
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

async function fetchResources(type: string, contentId: number) {
  try {
    const [magnetRes, cloudRes] = await Promise.all([
      fetch(`http://localhost:8080/api/resources/magnet?contentType=${type}&contentId=${contentId}`, { cache: 'no-store' }),
      fetch(`http://localhost:8080/api/resources/cloud?contentType=${type}&contentId=${contentId}`, { cache: 'no-store' }),
    ]);
    const magnetData = await magnetRes.json();
    const cloudData = await cloudRes.json();
    return {
      magnets: magnetData?.data || [],
      clouds: cloudData?.data || [],
    };
  } catch { return { magnets: [], clouds: [] }; }
}

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const movie = await fetchMovie(id);
  const { magnets, clouds } = await fetchResources('movie', id);

  if (!movie) {
    return (
      <div className="text-center py-16">
        <p style={{ color: 'var(--text-secondary)' }}>电影不存在</p>
        <Link href="/movie" className="text-sm mt-4 inline-block" style={{ color: 'var(--accent)' }}>← 返回电影列表</Link>
      </div>
    );
  }

  return <MovieDetailClient movie={movie} magnetResources={magnets} cloudResources={clouds} />;
}
