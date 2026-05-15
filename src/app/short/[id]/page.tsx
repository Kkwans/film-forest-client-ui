import ShortDramaDetailClient from './ShortDramaDetailClient';
import { getDetailMetadata } from '@/lib/metadata';

async function fetchShortDrama(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/short-dramas/${id}`, { cache: 'no-store' });
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
