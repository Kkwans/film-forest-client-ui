// @ts-nocheck
import type { Metadata } from 'next';
import AnimeDetailClient from './AnimeDetailClient';

async function fetchAnime(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/animes/${id}`, { cache: 'no-store' });
    const data = await res.json();
    const d = data?.data;
    if (!d || !d.id) return null;
    return { id: d.id, title: d.title, year: d.year, storyline: d.storyline || '' };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchAnime(Number(id));
  if (!item) return { title: '动漫未找到 - 影视森林' };
  const desc = item.storyline ? item.storyline.slice(0, 160) : `${item.title}(${item.year}) 评分、磁力链接、网盘资源下载。`;
  return {
    title: `${item.title} - 动漫 - 影视森林`,
    description: desc,
    openGraph: {
      title: `${item.title} (${item.year})`,
      description: desc,
      type: 'video.tv_show',
    },
  };
}

export default function AnimeDetailPage() {
  return <AnimeDetailClient />;
}
