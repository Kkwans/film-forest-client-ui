// @ts-nocheck
import type { Metadata } from 'next';
import VarietyDetailClient from './VarietyDetailClient';

async function fetchVariety(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/varieties/${id}`, { cache: 'no-store' });
    const data = await res.json();
    const d = data?.data;
    if (!d || !d.id) return null;
    return { id: d.id, title: d.title, year: d.year, storyline: d.storyline || '' };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchVariety(Number(id));
  if (!item) return { title: '综艺未找到 - 影视森林' };
  const desc = item.storyline ? item.storyline.slice(0, 160) : `${item.title}(${item.year}) 评分、磁力链接、网盘资源下载。`;
  return {
    title: `${item.title} - 综艺 - 影视森林`,
    description: desc,
    openGraph: {
      title: `${item.title} (${item.year})`,
      description: desc,
      type: 'video.tv_show',
    },
  };
}

export default function VarietyDetailPage() {
  return <VarietyDetailClient />;
}
