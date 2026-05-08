// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import dynamic from 'next/dynamic';

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
}: MovieCardProps) {
  const [navigating, setNavigating] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const contentType = type || 'movie';

  // Normalize region and genre using shared utils
  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  // For cards: show only first region
  const regionDisplay = regionArr.length > 0 ? regionArr[0] : '';
  // Clean title
  const cleanTitle = cleanTitleUtil(title);
  const fallbackCover = `https://picsum.photos/seed/${id}/300/450`;

  // Duration or episode badge text
  let badgeText = '';
  if (type === 'movie' && duration) {
    badgeText = `${duration}分钟`;
  } else if (episodes && episodes > 0) {
    badgeText = `${episodes}集`;
  }

  const handleClick = (e: React.MouseEvent) => {
    // Allow native link navigation - just set visual feedback
    setNavigating(true);
  };

  return (
    <>
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      className="group block no-underline"
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <div
        className="rounded-xl overflow-hidden border card-hover relative"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          opacity: navigating ? 0.7 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Navigation loading overlay */}
        {navigating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div
              className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        )}

        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={cover || fallbackCover}
            alt={title}
            className="w-full h-full object-cover img-zoom"
            loading="lazy"
          />
          {/* Rating badge - top right */}
          {rating != null && (
            <span
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {rating.toFixed(1)}
            </span>
          )}
          {/* Collect button - top left */}
          {showCollect && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCollectOpen(true);
              }}
              className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: '#fff',
              }}
              title="收藏"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          {/* Status badge - top left */}
          {status && (
            <span
              className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-medium text-white"
              style={{
                backgroundColor:
                  status === '更新中' || status === '连载中'
                    ? '#f59e0b'
                    : status === '已完结'
                    ? '#6b7280'
                    : 'var(--accent)',
              }}
            >
              {status}
            </span>
          )}
          {/* Duration/Episode badge - bottom right, semi-transparent */}
          {badgeText && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white bg-black/60 backdrop-blur-sm">
              {badgeText}
            </span>
          )}
        </div>

        {/* Info - fixed min-height for uniform card size */}
        <div className="p-2 md:p-3" style={{ minHeight: '60px' }}>
          {/* Title + Rating on same line */}
          <div className="flex items-center gap-1.5">
            <p
              className="font-medium text-xs md:text-sm truncate flex-1 min-w-0 group-hover:text-[var(--accent)] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {cleanTitle || '\u00A0'}
            </p>
            {rating != null ? (
              <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-xs shrink-0 invisible">0.0</span>
            )}
          </div>

          {/* Year left / Region right - always rendered for consistent height */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {year || '\u00A0'}
            </span>
            <span className="text-xs truncate ml-2" style={{ color: 'var(--text-muted)' }}>
              {regionDisplay || '\u00A0'}
            </span>
          </div>

          {/* Genre line - always rendered for consistent height */}
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {genreArr.length > 0 ? genreArr.slice(0, 3).join('/') : '\u00A0'}
          </p>
        </div>
      </div>
    </Link>
    {showCollect && (
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
