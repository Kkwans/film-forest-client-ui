import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const revalidate = 3600;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('drama', params);
}

export default function DramaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="drama" params={params} />;
}
