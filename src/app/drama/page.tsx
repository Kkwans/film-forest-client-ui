import ContentListPage from '@/components/ContentListPage';
import { getListMetadata } from '@/lib/metadata';
import type { RawSearchParams } from '@/lib/serverFetch';

export const metadata = getListMetadata('drama');

export default function DramaPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContentListPage contentType="drama" searchParams={searchParams} />;
}
