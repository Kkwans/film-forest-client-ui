import ContentListPage from '@/components/ContentListPage';
import { getListMetadata } from '@/lib/metadata';
import type { RawSearchParams } from '@/lib/serverFetch';

export const metadata = getListMetadata('movie');

export default function MoviePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContentListPage contentType="movie" searchParams={searchParams} />;
}
