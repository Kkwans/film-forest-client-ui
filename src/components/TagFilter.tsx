'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { tagApi, type GenreOption } from '@/lib/api';
import type { ContentType } from '@/lib/contentConstants';
import FilterChip from '@/components/FilterChip';

interface TagFilterProps {
  contentType: ContentType;
  selectedTagId: number | null;
  onSelect: (tagId: number | null) => void;
}

export default function TagFilter({ contentType, selectedTagId, onSelect }: TagFilterProps) {
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    tagApi.getGenres(contentType, { signal: controller.signal })
      .then((response) => {
        const data = response.data?.data;
        setGenres(Array.isArray(data) ? data : []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setGenres([]);
        setFailed(true);
        console.warn('[TagFilter] 标准题材加载失败', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [contentType, requestVersion]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden" aria-label="正在加载标准题材">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="h-8 w-16 shrink-0 animate-pulse rounded-full bg-muted" aria-hidden />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <button
        type="button"
        onClick={() => setRequestVersion((version) => version + 1)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-secondary-foreground hover:text-foreground"
      >
        <RotateCcw className="size-3.5" aria-hidden />题材加载失败，重试
      </button>
    );
  }

  return (
    <div className="filter-scroll-row" aria-label="标准题材筛选">
      <FilterChip label="全部题材" active={selectedTagId === null} onClick={() => onSelect(null)} />
      {genres.map((genre) => (
        <FilterChip
          key={genre.id}
          label={genre.name}
          active={selectedTagId === genre.id}
          onClick={() => onSelect(selectedTagId === genre.id ? null : genre.id)}
        />
      ))}
    </div>
  );
}
