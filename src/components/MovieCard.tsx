'use client';

import Link from 'next/link';
import { useState } from 'react';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { StatusIconButton, GenreTags } from '@/components/ContentShared';
import dynamic from 'next/dynamic';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

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
  movieStatus?: { listType: string; listName: string } | null;
}

/** 获取评分颜色 */
function getRatingColor(rating: number): string {
  if (rating >= 9) return 'var(--rating-9)';
  if (rating >= 8) return 'var(--rating-8)';
  if (rating >= 7) return 'var(--rating-7)';
  if (rating >= 6) return 'var(--rating-6)';
  return 'var(--rating-low)';
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
  const [navigating, setNavigating] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const contentType = type || 'movie';
  const resolvedCover = usePosterUrl(contentType, id, cover);

  const handleCollectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectOpen(true);
  };

  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  const regionDisplay = regionArr.length > 0 ? regionArr[0] : '';
  const cleanTitle = cleanTitleUtil(title);
  const fallbackCover = '/poster-placeholder.svg';

  let badgeText = '';
  if (type === 'movie' && duration) {
    badgeText = `${duration}分钟`;
  } else if (episodes && episodes > 0) {
    badgeText = `${episodes}集`;
  }

  const handleClick = () => {
    setNavigating(true);
  };

  const renderCollectButton = () => {
    if (!showCollect) return null;
    return (
      <StatusIconButton
        listType={movieStatus?.listType || null}
        onClick={handleCollectClick}
        size="sm"
        className="absolute top-1.5 left-1.5 z-10"
      />
    );
  };

  return (
    <>
    <Link
      href={href}
      prefetch={false}
      onClick={handleClick}
      className="group block no-underline"
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <div
        className="rounded-xl overflow-hidden border card-hover relative flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          opacity: navigating ? 0.7 : 1,
          transition: 'opacity 0.15s ease, transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {navigating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden poster-gradient">
          <LazyImage
            src={resolvedCover || fallbackCover}
            alt={title}
            className="rounded-none"
            imgClassName="img-zoom"
            placeholder="blur"
            aspectRatio={null}
            fallbackSrc={'/poster-placeholder.svg'}
            rootMargin="300px"
          />
          {/* Rating badge - enhanced */}
          {rating != null && (
            <span
              className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-sm shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${getRatingColor(rating)}dd, ${getRatingColor(rating)})`,
              }}
            >
              ★ {rating.toFixed(1)}
            </span>
          )}
          {renderCollectButton()}
          {status && (
            <span
              className={`absolute top-2 ${showCollect ? 'left-10' : 'left-2'} px-1.5 py-0.5 rounded text-xs font-medium text-white`}
              style={{
                backgroundColor:
                  status === '更新中' || status === '连载中'
                    ? 'var(--status-updating)'
                    : status === '已完结'
                    ? 'var(--text-muted)'
                    : 'var(--accent)',
              }}
            >
              {status}
            </span>
          )}
          {badgeText && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-medium text-white bg-black/60 backdrop-blur-sm">
              {badgeText}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 md:p-3 flex flex-col gap-1" style={{ minHeight: '76px' }}>
          <p className="font-semibold text-xs md:text-sm truncate min-w-0 group-hover:text-[var(--accent)] transition-colors">
            {cleanTitle || '\u00A0'}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            {year ? (
              <span className="text-[10px] md:text-xs text-muted-foreground">
                {year}
              </span>
            ) : null}
            {year && regionDisplay ? (
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
            ) : null}
            {regionDisplay ? (
              <span className="text-[10px] md:text-xs truncate max-w-[5em] text-muted-foreground">
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
