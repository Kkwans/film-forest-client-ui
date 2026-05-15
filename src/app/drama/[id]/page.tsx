import DramaDetailClient from './DramaDetailClient';
import { getDetailMetadata } from '@/lib/metadata';

async function fetchDrama(id: number) {
  try {
    const res = await fetch(`http://localhost:8080/api/dramas/${id}`, { cache: 'no-store' });
    const data = await res.json();
    const d = data?.data;
    if (!d || !d.id) return null;
    return { id: d.id, title: d.title, year: d.year, storyline: d.storyline || '' };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchDrama(Number(id));
  return getDetailMetadata('drama', item);
}

export default function DramaDetailPage() {
  return <DramaDetailClient />;
}
