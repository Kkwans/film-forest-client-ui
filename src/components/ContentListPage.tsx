import MovieListClient from '@/app/movie/MovieListClient';
import type { ContentType } from '@/lib/contentConstants';
import {
  fetchContentList,
  parseContentListQuery,
  type RawSearchParams,
} from '@/lib/serverFetch';

interface ContentListPageProps {
  contentType: ContentType;
  searchParams: Promise<RawSearchParams>;
}

/** 五类列表页共享的 Server Component 数据入口。 */
export default async function ContentListPage({ contentType, searchParams }: ContentListPageProps) {
  const query = parseContentListQuery(await searchParams);
  const { items, total, error } = await fetchContentList(contentType, query);
  return (
    <MovieListClient
      initialItems={items}
      initialTotal={total}
      initialError={error}
      contentType={contentType}
    />
  );
}
