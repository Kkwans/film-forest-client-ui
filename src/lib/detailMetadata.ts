import type { Metadata } from 'next';
import { getContentTypeConfig, type ContentType } from './contentConstants';
import { getContentDetail } from './detailData';
import { getDetailMetadata } from './metadata';

export async function generateContentMetadata(
  contentType: ContentType,
  params: Promise<{ id: string }>,
): Promise<Metadata> {
  const { id } = await params;
  const item = await getContentDetail(contentType, Number(id));
  return getDetailMetadata(getContentTypeConfig(contentType).metadataKey, item, 'summary');
}
