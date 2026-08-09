'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, X } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';
import Dialog from '@/components/Dialog';
import { usePlayHistoryStore, type PlayHistoryItem } from '@/stores/playHistoryStore';
import { formatRelativeTime } from '@/lib/utils';
import { usePosterUrl } from '@/hooks/usePosterUrl';

/** 格式化进度 */
function formatProgress(progress?: number): string {
  if (!progress) return '';
  const min = Math.floor(progress / 60);
  const sec = Math.floor(progress % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/** 内容类型到路径映射 */
function getDetailPath(item: PlayHistoryItem): string {
  const typeMap: Record<string, string> = {
    movie: 'movie',
    drama: 'drama',
    anime: 'anime',
    variety: 'variety',
    short_drama: 'short',
  };
  const path = typeMap[item.contentType] || item.contentType;
  return `/${path}/${item.contentId}`;
}

/** 内容类型中文名 */
function getTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    movie: '电影',
    drama: '电视剧',
    anime: '动漫',
    variety: '综艺',
    short_drama: '短剧',
  };
  return nameMap[type] || '影视';
}

/** 单个播放记录卡片 */
function HistoryCard({ item, onRemove }: { item: PlayHistoryItem; onRemove: () => void }) {
  const detailPath = getDetailPath(item);
  const posterUrl = usePosterUrl(item.contentType, item.contentId, item.cover);
  const progressPercent =
    item.progress && item.duration && item.duration > 0
      ? Math.min((item.progress / item.duration) * 100, 100)
      : 0;

  return (
    <div className="group relative shrink-0 w-40 sm:w-48 animate-fade-in-up">
      <Link href={detailPath} prefetch={false} className="block" aria-label={`继续观看《${item.title}》`}>
        {/* 封面 */}
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
          <LazyImage
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            placeholder="skeleton"
            fallbackSrc={'/poster-placeholder.svg'}
          />
          {/* 播放图标覆盖层 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/90 opacity-100 shadow-lg transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Play aria-hidden className="ml-0.5 h-5 w-5 fill-white text-white" />
            </div>
          </div>

          {/* 类型标签 */}
          <span className="absolute top-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {getTypeName(item.contentType)}
          </span>

          {/* 集数标签 */}
          {item.episode && (
            <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/90 text-white">
              第{item.episode}{item.episodeLabel || '集'}
            </span>
          )}

          {/* 进度条 */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* 信息区 */}
      <div className="mt-2 px-0.5">
        <Link href={detailPath} prefetch={false} className="block">
          <h3 className="text-sm font-medium text-foreground truncate hover:text-accent transition-colors">
            {item.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(item.lastPlayedAt)}
          </p>
          {item.progress && item.progress > 0 && (
            <p className="text-xs text-muted-foreground">
              看到 {formatProgress(item.progress)}
            </p>
          )}
        </div>
      </div>

      {/* 删除按钮放在右下角，避免与右上角集数标签重叠。 */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-[background-color,opacity] hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        title="移除记录"
        aria-label={`移除《${item.title}》的播放记录`}
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 继续观看区域 */
export default function ContinueWatching() {
  const history = usePlayHistoryStore((s) => s.history);
  const remove = usePlayHistoryStore((s) => s.remove);
  const clear = usePlayHistoryStore((s) => s.clear);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <section className="animate-fade-in-up stagger-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 bg-accent rounded-full" />
          继续观看
        </h2>
        <button
          type="button"
          onClick={() => setClearDialogOpen(true)}
          className="min-h-9 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-accent"
        >
          清空记录
        </button>
      </div>

      {/* 横向滚动 */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {history.slice(0, 20).map((item) => (
          <HistoryCard
            key={`${item.contentType}-${item.contentId}`}
            item={item}
            onRemove={() => remove(item.contentId, item.contentType)}
          />
        ))}
      </div>

      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={() => { clear(); setClearDialogOpen(false); }}
        title="清空播放记录"
        message="确定清空所有播放记录？此操作不可撤销。"
        confirmText="清空"
        variant="danger"
      />
    </section>
  );
}
