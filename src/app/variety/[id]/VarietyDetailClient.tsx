'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { varietyApi } from '@/lib/api';
import { parseRegion, parseGenre, cleanStoryline } from '@/lib/utils';
import DetailPageLayout, { DetailPageLoading, DetailPageNotFound, type DetailItem } from '@/components/DetailPageLayout';

export default function VarietyDetailClient() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await varietyApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          rating: d.scoreDouban, summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '更新中' : '已完结',
          totalEpisode: d.totalEpisode,
          genre: parseGenre(d.genre),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  if (loading) return <DetailPageLoading />;
  if (!item) return <DetailPageNotFound listPath="/variety" listLabel="综艺" typeName="综艺" />;

  return (
    <DetailPageLayout
      item={item}
      config={{
        contentType: 'variety',
        listPath: '/variety',
        listLabel: '综艺',
        episodeLabel: '期',
        hasEpisodes: true,
        updatingText: '更新中',
      }}
    />
  );
}
