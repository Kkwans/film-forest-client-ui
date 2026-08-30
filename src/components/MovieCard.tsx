'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { GenreTags, PosterStatusControl, RatingBadge } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { listApi } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import { useContentStatusStore } from '@/stores/contentStatusStore';

interface MovieStatus {
  listType: string;
  listName: string;
  wantToWatch?: boolean;
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
  const userId = useUserStore((state) => state.user?.id ?? null);
  const [navigating, setNavigating] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const contentType = type || 'movie';
  const currentStatus = movieStatus || null;
  const identityKey = isAuthenticated && userId ? `user:${userId}` : 'anonymous';
  const patchStatus = useContentStatusStore((state) => state.patchStatus);
  const resolvedCover = usePosterUrl(contentType, id, cover);

  const handleWantToggle = useCallback(async () => {
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (statusLoading) return;

    setStatusLoading(true);
    try {
      const response = await listApi.getDefaults();
      const lists = Array.isArray(response.data.data) ? response.data.data : [];
      const wantList = lists.find((list) => list.type === 'want_to_watch');
      if (!wantList) {
        showToast('想看片单暂不可用，请稍后重试', 'error');
        return;
      }
      if (currentStatus?.wantToWatch ?? currentStatus?.listType === 'want_to_watch') {
        await listApi.removeItem(wantList.id, { movieId: id, contentType });
        patchStatus(identityKey, contentType, id, currentStatus?.listType === 'want_to_watch' ? null : { ...currentStatus, wantToWatch: false });
        showToast('已从想看移除', 'info');
      } else {
        await listApi.addItem(wantList.id, { movieId: id, contentType });
        patchStatus(identityKey, contentType, id, currentStatus ? { ...currentStatus, wantToWatch: true } : { listType: 'want_to_watch', listName: wantList.name, wantToWatch: true });
        showToast('已加入想看', 'success');
      }
    } catch {
      showToast('想看状态更新失败，请重试', 'error');
    } finally {
      setStatusLoading(false);
    }
  }, [contentType, currentStatus, id, identityKey, isAuthenticated, patchStatus, router, showToast, statusLoading]);

  const regionArr = parseRegion(region);
  const genreArr = parseGenre(genre);
  const regionDisplay = regionArr.join(' / ');
  const hasRating = rating != null && Number.isFinite(rating) && rating > 0;
  const wantToWatch = Boolean(currentStatus?.wantToWatch ?? currentStatus?.listType === 'want_to_watch');
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
      <article className="group relative h-full">
        <Link
          href={href}
          prefetch={false}
          onClick={() => setNavigating(true)}
          className="block h-full no-underline"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <div
            className="card-hover relative flex h-full flex-col overflow-hidden rounded-xl border"
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
              imgClassName="img-zoom object-cover object-center"
              placeholder="blur"
              aspectRatio={null}
              fallbackSrc={fallbackCover}
              rootMargin="300px"
            />

            {hasRating && (
              <span className="absolute left-2 top-2">
                <RatingBadge score={rating} />
              </span>
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

          <div className="flex min-h-[5.75rem] flex-1 flex-col gap-1.5 p-2.5 md:min-h-24 md:p-3">
            <p className="min-w-0 truncate text-sm font-semibold leading-5 transition-colors group-hover:text-[var(--accent)]" title={cleanTitle}>
              {cleanTitle || '\u00A0'}
            </p>
            <div className="flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden">
              {year ? <span className="text-xs text-muted-foreground">{year}</span> : null}
              {year && regionDisplay ? <span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground" /> : null}
              {regionDisplay ? (
                <span
                  className="min-w-0 truncate text-xs leading-4 text-muted-foreground"
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

        {showCollect && (
          <div className="absolute right-2 top-2 z-30">
            <PosterStatusControl
              listType={currentStatus?.listType}
              wantToWatch={wantToWatch}
              loading={statusLoading}
              onToggleWant={(event) => { event.preventDefault(); event.stopPropagation(); void handleWantToggle(); }}
            />
          </div>
        )}
      </article>
    </>
  );
}
