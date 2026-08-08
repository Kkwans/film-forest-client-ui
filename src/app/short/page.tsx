import ContentListPage from '@/components/ContentListPage';
import { getListMetadata } from '@/lib/metadata';
import type { RawSearchParams } from '@/lib/serverFetch';

export const metadata = getListMetadata('short');

export default function ShortPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContentListPage contentType="short_drama" searchParams={searchParams} />;
}
