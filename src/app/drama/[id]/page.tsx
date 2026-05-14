// @ts-nocheck
import type { Metadata } from 'next';
import DramaDetailClient from './DramaDetailClient';

async function fetchDrama(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/dramas/${id}`, { cache: 'no-store' });
    const data = await res.json();
    const d = data?.data;
    if (!d || !d.id) return null;
    return { id: d.id, title: d.title, year: d.year, storyline: d.storyline || '' };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const drama = await fetchDrama(Number(id));
  if (!drama) return { title: '剧集未找到 - 影视森林' };
  const desc = drama.storyline ? drama.storyline.slice(0, 160) : `${drama.title}(${drama.year}) 评分、磁力链接、网盘资源下载。`;
  return {
    title: `${drama.title} - 电视剧 - 影视森林`,
    description: desc,
    openGraph: {
      title: `${drama.title} (${drama.year})`,
      description: desc,
      type: 'video.tv_show',
    },
  };
}

export default function DramaDetailPage() {
  return <DramaDetailClient />;
}
