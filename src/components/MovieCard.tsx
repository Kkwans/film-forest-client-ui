// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { listApi } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
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
  // Pre-fetched movie status: which list this movie is in
  movieStatus?: { listType: string; listName: string } | null;
}

// Status icon config: priority watched > watching > want_to_watch > custom
const STATUS_ICONS: Record<string, { icon: string; label: string; color: string; fill: boolean }> = {
  watched: {
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    label: '看过',
    color: '#22c55e',
    fill: true,
  },
  watching: {
    icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    label: '在看',
    color: '#3b82f6',
    fill: false,
  },
  want_to_watch: {
    icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    label: '想看',
    color: '#ef4444',
    fill: true,
  },
  custom: {
    icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    label: '已收藏',
    color: '#8b5cf6',
    fill: true,
  },
};

function getStatusConfig(listType: string | undefined) {
  if (!listType) return null;
  return STATUS_ICONS[listType] || STATUS_ICONS.custom;
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
  const [toggling, setToggling] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { showToast } = useToast();
  const contentType = type || 'movie';
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const statusConfig = getStatusConfig(movieStatus?.listType);
  const isInDefaultList = movieStatus?.listType === 'want_to_watch' || movieStatus?.listType === 'watching' || movieStatus?.listType === 'watched';

  // Single click: toggle want_to_watch or show toast for other statuses
  const handleSingleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || toggling) return;

    // If in watching or watched, show toast
    if (movieStatus?.listType === 'watching' || movieStatus?.listType === 'watched') {
      showToast(`该影片已被标记为${movieStatus.listName}`, 'warning');
      return;
    }

    setToggling(true);
    try {
      const res = await listApi.getAll();
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: any) => l.type === 'want_to_watch') : null;
      if (!wantList) { setToggling(false); return; }

      if (movieStatus?.listType === 'want_to_watch') {
        // Already in want_to_watch → remove
        await listApi.removeItem(wantList.id, { movieId: id, contentType });
        showToast('已从想看移除', 'error');
      } else {
        // Not in any default list → add to want_to_watch
        await listApi.addItem(wantList.id, { movieId: id, contentType });
        showToast('已加入想看', 'success');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('movie-status-changed', { detail: { movieId: id } }));
      }
    } catch {} finally {
      setToggling(false);
    }
  }, [isAuthenticated, toggling, id, contentType, movieStatus, showToast]);

  // Handle click with delay to distinguish single/double
  const handleCollectClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimer.current) {
      // Double click → open modal
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setCollectOpen(true);
    } else {
      // Single click → add to want_to_watch or show toast
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

  let badgeText = '';
  if (type === 'movie' && duration) {
    badgeText = `${duration}分钟`;
  } else if (episodes && episodes > 0) {
    badgeText = `${episodes}集`;
  }

  const handleClick = (e: React.MouseEvent) => {
    setNavigating(true);
  };

  // Render collect/status button
  const renderCollectButton = () => {
    if (!showCollect) return null;

    if (statusConfig) {
      // Movie is in a list - show status icon
      return (
        <button
          onClick={handleCollectClick}
          className="absolute top-1 left-1 z-10 w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:scale-110"
          style={{
            backgroundColor: `${statusConfig.color}cc`,
            color: '#fff',
          }}
          title={`${statusConfig.label}（单击提示，双击选择片单）`}
        >
          {toggling ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : statusConfig.fill ? (
            <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <path d={statusConfig.icon} />
            </svg>
          ) : (
            <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={statusConfig.icon} />
            </svg>
          )}
        </button>
      );
    }

    // Default: heart icon (not in any list)
    return (
      <button
        onClick={handleCollectClick}
        className="absolute top-1 left-1 z-10 w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:scale-110"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          color: '#fff',
        }}
        title="想看（单击加入，双击选择片单）"
      >
        {toggling ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </button>
    );
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
          {rating != null && (
            <span
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {rating.toFixed(1)}
            </span>
          )}
          {renderCollectButton()}
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
          {badgeText && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white bg-black/60 backdrop-blur-sm">
              {badgeText}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-2 md:p-3 flex flex-col gap-1" style={{ minHeight: '72px' }}>
          <p
            className="font-medium text-xs md:text-sm truncate min-w-0 group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {cleanTitle || '\u00A0'}
          </p>

          <div className="flex items-center gap-1 flex-wrap">
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
