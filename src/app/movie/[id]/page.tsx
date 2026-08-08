import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const revalidate = 3600;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('movie', params);
}

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="movie" params={params} />;
}
