// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { listApi } from '@/lib/userApi';
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
  const [added, setAdded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const contentType = type || 'movie';
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Single click: add to want_to_watch
  const handleSingleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || toggling) return;
    setToggling(true);
    try {
      const res = await listApi.getAll();
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: any) => l.type === 'want_to_watch') : null;
      if (wantList) {
        await listApi.addItem(wantList.id, { movieId: id, contentType });
        setAdded(true);
      }
    } catch {
      setAdded(true);
    } finally {
      setToggling(false);
    }
  }, [isAuthenticated, toggling, id, contentType]);

  // Handle click with delay to distinguish single/double
  const handleCollectClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setCollectOpen(true);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleSingleClick(e);
      }, 250);
    }
  }, [handleSingleClick]);

  // Normalize region and genre
  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  const regionDisplay = regionArr.length > 0 ? regionArr[0] : '';
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
        className="rounded-xl overflow-hidden border card-hover relative flex flex-col"
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
              onClick={handleCollectClick}
              className="absolute top-1 left-1 z-10 w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:scale-110"
              style={{
                backgroundColor: added ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0,0,0,0.4)',
                color: '#fff',
              }}
              title={added ? '已想看（单击取消，双击选择片单）' : '想看（单击加入，双击选择片单）'}
            >
              {toggling ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill={added ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
            </button>
          )}
          {/* Status badge */}
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
          {/* Duration/Episode badge */}
          {badgeText && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white bg-black/60 backdrop-blur-sm">
              {badgeText}
            </span>
          )}
        </div>

        {/* Info section - fixed height for uniform cards */}
        <div className="p-2 md:p-3 flex flex-col gap-1" style={{ minHeight: '72px' }}>
          {/* Title: always 1 line, truncate */}
          <p
            className="font-medium text-xs md:text-sm truncate min-w-0 group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {cleanTitle || '\u00A0'}
          </p>

          {/* Rating + Year + Region in compact row */}
          <div className="flex items-center gap-1 flex-wrap">
            {rating != null ? (
              <span className="text-[10px] md:text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                ★{rating.toFixed(1)}
              </span>
            ) : null}
            {year ? (
              <span className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>
                {year}
              </span>
            ) : null}
            {regionDisplay ? (
              <span className="text-[10px] md:text-xs truncate max-w-[5em]" style={{ color: 'var(--text-muted)' }}>
                {regionDisplay}
              </span>
            ) : null}
          </div>

          {/* Genre tags - show as many as fit */}
          {genreArr.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap overflow-hidden" style={{ maxHeight: '22px' }}>
              {genreArr.map((g, i) => (
                <span
                  key={i}
                  className="text-[9px] md:text-[10px] px-1 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}
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
