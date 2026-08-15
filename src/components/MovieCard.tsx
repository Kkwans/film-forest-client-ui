'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { StatusIconButton, GenreTags } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { listApi } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import { createSingleDoubleClickGuard } from '@/lib/uiContracts';

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
  const { showToast } = useToast();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const [navigating, setNavigating] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<MovieStatus | null>(movieStatus || null);
  const singleActionRef = useRef<() => void>(() => undefined);
  const doubleActionRef = useRef<() => void>(() => undefined);
  const clickGuardRef = useRef<ReturnType<typeof createSingleDoubleClickGuard> | null>(null);
  const contentType = type || 'movie';
  const resolvedCover = usePosterUrl(contentType, id, cover);

  useEffect(() => setCurrentStatus(movieStatus || null), [movieStatus]);

  const handleWantToggle = useCallback(async () => {
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (statusLoading) return;

    setStatusLoading(true);
    try {
      const response = await listApi.getAll();
      const lists = Array.isArray(response.data.data) ? response.data.data : [];
      const wantList = lists.find((list) => list.type === 'want_to_watch');
      if (!wantList) {
        showToast('想看片单暂不可用，请稍后重试', 'error');
        return;
      }

      if (currentStatus?.listType === 'want_to_watch') {
        await listApi.removeItem(wantList.id, { movieId: id, contentType });
        setCurrentStatus(null);
        showToast('已从想看移除', 'info');
      } else if (currentStatus) {
        showToast('当前观看状态请在片单管理中调整', 'info');
        return;
      } else {
        await listApi.addItem(wantList.id, { movieId: id, contentType });
        setCurrentStatus({ listType: 'want_to_watch', listName: wantList.name });
        showToast('已加入想看', 'success');
      }
      window.dispatchEvent(new CustomEvent('movie-status-changed', { detail: { movieId: id, contentType } }));
    } catch {
      showToast('想看状态更新失败，请重试', 'error');
    } finally {
      setStatusLoading(false);
    }
  }, [contentType, currentStatus, id, isAuthenticated, router, showToast, statusLoading]);

  useEffect(() => {
    singleActionRef.current = () => { void handleWantToggle(); };
    doubleActionRef.current = () => setCollectOpen(true);
  }, [handleWantToggle]);

  useEffect(() => {
    const guard = createSingleDoubleClickGuard(
      () => singleActionRef.current(),
      () => doubleActionRef.current(),
    );
    clickGuardRef.current = guard;
    return () => {
      guard.dispose();
      if (clickGuardRef.current === guard) clickGuardRef.current = null;
    };
  }, []);

  const handleCollectClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    clickGuardRef.current?.handle();
  };

  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  const regionDisplay = regionArr.join(' / ');
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
              className="rounded-none"
              imgClassName="img-zoom"
              placeholder="blur"
              aspectRatio={null}
              fallbackSrc={fallbackCover}
              rootMargin="300px"
            />

            <span
              className="absolute left-2 top-2 inline-flex min-h-6 items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm"
              aria-label={`豆瓣评分 ${rating != null && rating > 0 ? rating.toFixed(1) : '暂无'}`}
            >
              {rating != null && rating > 0 && <Star aria-hidden className="size-3 fill-current" />}
              <span>{rating != null && rating > 0 ? rating.toFixed(1) : '--'}</span>
            </span>

            {showCollect && (
              <StatusIconButton
                listType={currentStatus?.listType || null}
                onClick={handleCollectClick}
                size="sm"
                loading={statusLoading}
                title="单击切换想看，双击管理片单"
                className="absolute right-2 top-2 z-10"
              />
            )}

            {status && (
              <span
                className="absolute left-2 top-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
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

          <div className="flex min-h-[92px] flex-col gap-1 p-2.5 md:p-3">
            <p className="min-w-0 truncate text-xs font-semibold transition-colors group-hover:text-[var(--accent)] md:text-sm">
              {cleanTitle || '\u00A0'}
            </p>
            <div className="flex flex-wrap items-start gap-x-1.5 gap-y-0.5">
              {year ? <span className="text-[10px] text-muted-foreground md:text-xs">{year}</span> : null}
              {year && regionDisplay ? <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground" /> : null}
              {regionDisplay ? <span className="break-words text-[10px] leading-4 text-muted-foreground md:text-xs">{regionDisplay}</span> : null}
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
