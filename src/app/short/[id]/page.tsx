import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('short_drama', params);
}

export default function ShortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="short_drama" params={params} />;
}
