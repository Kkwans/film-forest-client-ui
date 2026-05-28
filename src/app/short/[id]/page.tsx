import ShortDramaDetailClient from './ShortDramaDetailClient';
import { getDetailMetadata } from '@/lib/metadata';

// ISR: 短剧详情页每小时重新验证
export const revalidate = 3600;

const BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchShortDrama(id: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/short-dramas/${id}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const d = data?.data;
    if (!d || !d.id) return null;
    return { id: d.id, title: d.title, year: d.year, storyline: d.storyline || '' };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchShortDrama(Number(id));
  return getDetailMetadata('short', item);
}

export default function ShortDramaDetailPage() {
  return <ShortDramaDetailClient />;
}
