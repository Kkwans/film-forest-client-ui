import ContentListPage from '@/components/ContentListPage';
import { getListMetadata } from '@/lib/metadata';
import type { RawSearchParams } from '@/lib/serverFetch';

export const metadata = getListMetadata('anime');

export default function AnimePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContentListPage contentType="anime" searchParams={searchParams} />;
}
