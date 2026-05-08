// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, useEffect } from 'react';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { listApi, type UserList } from '@/lib/userApi';
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
  const [isInWantList, setIsInWantList] = useState(false);
  const [wantListId, setWantListId] = useState<number | null>(null);
  const [togglingWant, setTogglingWant] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const contentType = type || 'movie';
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch want_to_watch list status for this movie
  useEffect(() => {
    if (!isAuthenticated || !showCollect) return;
    const checkStatus = async () => {
      try {
        const res = await listApi.getAll();
        const lists: UserList[] = res.data.data || res.data;
        const wantList = lists.find((l) => l.type === 'want_to_watch');
        if (wantList) {
          setWantListId(wantList.id);
          // Check if this movie is in the want list
          try {
            const itemsRes = await listApi.getItems(wantList.id, { page: 1, size: 500 });
            const items = itemsRes.data.data?.records || itemsRes.data.data || itemsRes.data || [];
            const found = Array.isArray(items) && items.some((item: any) => item.movieId === id);
            setIsInWantList(found);
          } catch {
            // silent
          }
        }
      } catch {
        // silent
      }
    };
    checkStatus();
  }, [isAuthenticated, id, showCollect]);

  // Single click: toggle want_to_watch list
  const handleSingleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !wantListId || togglingWant) return;
    setTogglingWant(true);
    try {
      if (isInWantList) {
        await listApi.removeItem(wantListId, { movieId: id, contentType });
        setIsInWantList(false);
      } else {
        await listApi.addItem(wantListId, { movieId: id, contentType });
        setIsInWantList(true);
      }
    } catch {
      // silent
    } finally {
      setTogglingWant(false);
    }
  }, [isAuthenticated, wantListId, togglingWant, isInWantList, id, contentType]);

  // Double click: open collect modal
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setCollectOpen(true);
  }, []);

  // Handle click with delay to distinguish single/double
  const handleCollectClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimer.current) {
      // Double click detected
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setCollectOpen(true);
    } else {
      // Wait to see if it's a double click
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleSingleClick(e);
      }, 250);
    }
  }, [handleSingleClick]);

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
          {/* Collect button - top left. Single click: toggle want list. Double click: open modal */}
          {showCollect && (
            <button
              onClick={handleCollectClick}
              onDoubleClick={handleDoubleClick}
              className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:scale-110"
              style={{
                backgroundColor: isInWantList ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0,0,0,0.4)',
                color: '#fff',
              }}
              title={isInWantList ? '已想看（单击移除，双击选择片单）' : '想看（单击加入，双击选择片单）'}
            >
              {togglingWant ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isInWantList ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
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
          {/* Title: mobile allows 2 lines, desktop truncates */}
          <p
            className="font-medium text-xs md:text-sm line-clamp-2 md:truncate flex-1 min-w-0 group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {cleanTitle || '\u00A0'}
          </p>

          {/* Rating + Year + Region in compact row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {rating != null ? (
              <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                ★{rating.toFixed(1)}
              </span>
            ) : null}
            {year ? (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {year}
              </span>
            ) : null}
            {regionDisplay ? (
              <span className="text-xs truncate max-w-[4em]" style={{ color: 'var(--text-muted)' }}>
                {regionDisplay}
              </span>
            ) : null}
          </div>

          {/* Genre tags */}
          {genreArr.length > 0 ? (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {genreArr.slice(0, 2).map((g, i) => (
                <span
                  key={i}
                  className="text-[10px] md:text-xs px-1.5 py-0.5 rounded-full"
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
