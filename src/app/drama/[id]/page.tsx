import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('drama', params);
}

export default function DramaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="drama" params={params} />;
}
