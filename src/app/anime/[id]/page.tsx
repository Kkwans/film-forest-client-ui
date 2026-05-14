// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { animeApi } from '@/lib/api';
import { parseRegion, parseGenre, cleanStoryline } from '@/lib/utils';
import DetailPageLayout, { DetailPageLoading, DetailPageNotFound, type DetailItem } from '@/components/DetailPageLayout';

export default function AnimeDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await animeApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          rating: d.scoreDouban, summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '连载中' : '已完结',
          totalEpisode: d.totalEpisode,
          genre: parseGenre(d.genre),
          director: Array.isArray(d.director) ? d.director : (d.director ? JSON.parse(d.director) : []),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  if (loading) return <DetailPageLoading />;
  if (!item) return <DetailPageNotFound listPath="/anime" listLabel="动漫" typeName="动漫" />;

  return (
    <DetailPageLayout
      item={item}
      config={{
        contentType: 'anime',
        listPath: '/anime',
        listLabel: '动漫',
        episodeLabel: '集',
        hasEpisodes: true,
        updatingText: '连载中',
      }}
    />
  );
}
