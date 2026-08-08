import ContentDetailPage from '@/components/ContentDetailPage';
import { generateContentMetadata } from '@/lib/detailMetadata';

export const revalidate = 3600;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generateContentMetadata('variety', params);
}

export default function VarietyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage contentType="variety" params={params} />;
}
