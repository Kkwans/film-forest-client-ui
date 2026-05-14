// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { dramaApi } from '@/lib/api';
import { parseRegion, parseGenre, cleanStoryline } from '@/lib/utils';
import DetailPageLayout, { DetailPageLoading, DetailPageNotFound, type DetailItem } from '@/components/DetailPageLayout';

export default function DramaDetailClient() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await dramaApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          rating: d.scoreDouban, summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '更新中' : '已完结',
          totalEpisode: d.totalEpisode, currentEpisode: d.currentEpisode,
          genre: parseGenre(d.genre),
          director: Array.isArray(d.director) ? d.director : (d.director ? JSON.parse(d.director) : []),
          actor: Array.isArray(d.actor) ? d.actor : (d.actor ? JSON.parse(d.actor) : []),
          language: Array.isArray(d.language) ? d.language : (d.language ? [d.language] : []),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  if (loading) return <DetailPageLoading />;
  if (!item) return <DetailPageNotFound listPath="/drama" listLabel="电视剧" typeName="剧集" />;

  return (
    <DetailPageLayout
      item={item}
      config={{
        contentType: 'drama',
        listPath: '/drama',
        listLabel: '电视剧',
        episodeLabel: '集',
        hasEpisodes: true,
        updatingText: '更新中',
      }}
    />
  );
}
