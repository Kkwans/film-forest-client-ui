'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { StatusIconButton, GenreTags } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { useUserStore } from '@/stores/userStore';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface MovieStatus {
  listType: string;
  listName: string;
}

interface MovieCardProps {
  id: number;
  title: string;
  cover?: string;
  year?: number;
  region?: string | string[];
  rating?: number;
  type?: string;
  genre?: string[];
  status?: string;
  episodes?: number;
  duration?: number;
  href: string;
  showCollect?: boolean;
  movieStatus?: MovieStatus | null;
}

export default function MovieCard({
  id,
  title,
  cover,
  year,
  region,
  rating,
  type,
  genre,
  status,
  episodes,
  duration,
  href,
  showCollect = true,
  movieStatus,
}: MovieCardProps) {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const [navigating, setNavigating] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const contentType = type || 'movie';
  const resolvedCover = usePosterUrl(contentType, id, cover);

  const handleCollectClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setCollectOpen(true);
  };

  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  const regionDisplay = regionArr.join(' / ');
  const hasRating = rating != null && Number.isFinite(rating) && rating > 0;
  const cleanTitle = cleanTitleUtil(title);
  const fallbackCover = '/poster-placeholder.svg';

  let badgeText = '';
  if (type === 'movie' && duration) {
    badgeText = `${duration}分钟`;
  } else if (episodes && episodes > 0) {
    badgeText = `${episodes}集`;
  }

  return (
    <>
      <Link
        href={href}
        prefetch={false}
        onClick={() => setNavigating(true)}
        className="group block no-underline"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <div
          className="card-hover relative flex flex-col overflow-hidden rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            opacity: navigating ? 0.7 : 1,
          }}
        >
          {navigating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          )}

          <div className="poster-gradient relative aspect-[2/3] overflow-hidden">
            <LazyImage
              src={resolvedCover || fallbackCover}
              alt={title}
              className="h-full rounded-none"
              imgClassName="img-zoom"
              placeholder="blur"
              aspectRatio={null}
              fallbackSrc={fallbackCover}
              rootMargin="300px"
            />

            {hasRating && (
              <span
                className="absolute left-2 top-2 inline-flex min-h-6 items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm"
                aria-label={`豆瓣评分 ${rating.toFixed(1)}`}
              >
                <Star aria-hidden className="size-3 fill-current" />
                <span>{rating.toFixed(1)}</span>
              </span>
            )}

            {showCollect && (
              <StatusIconButton
                listType={movieStatus?.listType || null}
                onClick={handleCollectClick}
                size="sm"
                title={movieStatus?.listType ? '管理观看状态' : '加入片单'}
                variant="overlay"
                emptyIcon="heart"
                className="absolute right-2 top-2 z-10"
              />
            )}

            {status && (
              <span
                className={`absolute left-2 ${hasRating ? 'top-10' : 'top-2'} rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm`}
                style={{
                  color: status === '更新中' || status === '连载中'
                    ? 'var(--status-updating)'
                    : status === '已完结'
                      ? 'var(--text-muted)'
                      : '#fff',
                }}
              >
                {status}
              </span>
            )}
            {badgeText && <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{badgeText}</span>}
          </div>

          <div className="flex min-h-[104px] flex-col gap-1.5 p-2.5 md:p-3">
            <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 transition-colors group-hover:text-[var(--accent)]">
              {cleanTitle || '\u00A0'}
            </p>
            <div className="flex flex-wrap items-start gap-x-1.5 gap-y-0.5">
              {year ? <span className="text-xs text-muted-foreground">{year}</span> : null}
              {year && regionDisplay ? <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground" /> : null}
              {regionDisplay ? (
                <span
                  className="min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-4 text-muted-foreground md:overflow-visible md:whitespace-normal"
                  title={regionDisplay}
                >
                  {regionDisplay}
                </span>
              ) : null}
            </div>
            <GenreTags genres={genreArr} />
          </div>
        </div>
      </Link>

      {showCollect && collectOpen && (
        <CollectModal
          open={collectOpen}
          onClose={() => setCollectOpen(false)}
          movieId={id}
          contentType={contentType}
          movieTitle={title}
        />
      )}
    </>
  );
}
