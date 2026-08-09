import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('variety', params);
}

export default function VarietyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="variety" params={params} />;
}
