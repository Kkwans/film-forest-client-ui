// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shortDramaApi } from '@/lib/api';
import { parseRegion, parseGenre, cleanStoryline } from '@/lib/utils';
import DetailPageLayout, { DetailPageLoading, DetailPageNotFound, type DetailItem } from '@/components/DetailPageLayout';

export default function ShortDramaDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await shortDramaApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '更新中' : '已完结',
          totalEpisode: d.totalEpisode, duration: d.duration,
          genre: parseGenre(d.genre),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  if (loading) return <DetailPageLoading />;
  if (!item) return <DetailPageNotFound listPath="/short" listLabel="短剧" typeName="短剧" />;

  return (
    <DetailPageLayout
      item={item}
      config={{
        contentType: 'short_drama',
        listPath: '/short',
        listLabel: '短剧',
        episodeLabel: '集',
        hasEpisodes: true,
        updatingText: '更新中',
      }}
    />
  );
}
