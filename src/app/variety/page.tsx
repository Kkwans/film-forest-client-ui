import ContentListPage from '@/components/ContentListPage';
import { getListMetadata } from '@/lib/metadata';
import type { RawSearchParams } from '@/lib/serverFetch';

export const metadata = getListMetadata('variety');

export default function VarietyPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContentListPage contentType="variety" searchParams={searchParams} />;
}
