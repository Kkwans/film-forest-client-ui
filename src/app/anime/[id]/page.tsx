import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const revalidate = 3600;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('anime', params);
}

export default function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="anime" params={params} />;
}
