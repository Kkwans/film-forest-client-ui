import { notFound } from 'next/navigation';
import DetailPageLayout from '@/components/DetailPageLayout';
import { getContentTypeConfig, type ContentType } from '@/lib/contentConstants';
import { getContentDetail } from '@/lib/detailData';

export default async function ContentDetailPage({ contentType, params }: {
  contentType: ContentType;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getContentDetail(contentType, Number(id));
  if (!item) notFound();
  const config = getContentTypeConfig(contentType);
  return (
    <DetailPageLayout
      item={item}
      config={{
        contentType,
        listPath: `/${config.route}`,
        listLabel: config.label,
        hasEpisodes: contentType !== 'movie',
        episodeLabel: '集',
        updatingText: '更新中',
      }}
    />
  );
}
