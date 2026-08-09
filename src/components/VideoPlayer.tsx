'use client';

import { useState, useRef, useCallback, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Hls from 'hls.js';
import { CircleAlert, Clapperboard, Star } from 'lucide-react';
import { usePlayHistoryStore } from '@/stores/playHistoryStore';
import { getPlaybackSourceMode } from '@/lib/playbackSource';

/** 播放源 */
export interface PlayerSource {
  id: number;
  sourceName?: string;
  sourceUrl?: string;
  sourcePageUrl?: string;
  playbackType?: string;
}

/** 播放器 Props */
interface VideoPlayerProps {
  /** 当前播放源 URL */
  src?: string;
  /** 标题 */
  title: string;
  /** 内容 ID */
  contentId: number;
  /** 内容类型 */
  contentType: string;
  /** 封面 */
  cover?: string;
  /** 当前集数 */
  episode?: number;
  /** 集数标签 */
  episodeLabel?: string;
  /** 年份 */
  year?: number;
  /** 评分 */
  rating?: number;
  /** 标准题材 */
  genres?: string[];
  /** 地区 */
  region?: string;
  /** 总集数 */
  totalEpisodes?: number;
  /** 可用播放源列表 */
  sources?: PlayerSource[];
  /** 切换集数回调 */
  onEpisodeChange?: (ep: number) => void;
  /** 切换播放源回调 */
  onSourceChange?: (source: PlayerSource) => void;
  /** 是否正在加载 */
  loading?: boolean;
}

export default function VideoPlayer({
  src,
  title,
  contentId,
  contentType,
  cover,
  episode,
  episodeLabel = '集',
  year,
  rating,
  genres,
  region,
  totalEpisodes,
  sources = [],
  onEpisodeChange,
  onSourceChange,
  loading = false,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerReloadKey, setPlayerReloadKey] = useState(0);
  const addOrUpdate = usePlayHistoryStore((s) => s.addOrUpdate);
  const activeSource = useMemo(
    () => sources.find((source) => source.sourceUrl === src),
    [sources, src],
  );
  const sourceMode = getPlaybackSourceMode(src, activeSource?.playbackType);
  const isPlayable = sourceMode === 'hls' || sourceMode === 'video' || sourceMode === 'embed';
  const fallbackUrl = activeSource?.sourcePageUrl || src;

  const clearPlayerTimeout = useCallback(() => {
    if (playerTimeoutRef.current) {
      clearTimeout(playerTimeoutRef.current);
      playerTimeoutRef.current = null;
    }
  }, []);

  // 记录播放历史
  useEffect(() => {
    if (src && isPlayable) {
      addOrUpdate({
        contentId,
        contentType,
        title,
        cover,
        episode,
        episodeLabel,
        year,
        rating,
        genres,
        region,
        sourceUrl: src,
        sourceName: activeSource?.sourceName,
      });
    }
  }, [src, isPlayable, contentId, contentType, title, cover, episode, episodeLabel, year, rating, genres, region, activeSource, addOrUpdate]);

  // 播放器加载状态。超时后保留来源页作为明确降级路径。
  useEffect(() => {
    clearPlayerTimeout();
    if (src && isPlayable) {
      setPlayerLoaded(false);
      setPlayerError(false);
      playerTimeoutRef.current = setTimeout(() => {
        setPlayerLoaded(true);
        setPlayerError(true);
      }, 20000);
    }
    return clearPlayerTimeout;
  }, [clearPlayerTimeout, isPlayable, playerReloadKey, src]);

  // Safari 使用原生 HLS；其他现代浏览器通过 hls.js + Media Source 播放。
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || (sourceMode !== 'hls' && sourceMode !== 'video')) return;

    let hls: Hls | null = null;
    const handleReady = () => {
      clearPlayerTimeout();
      setPlayerLoaded(true);
      setPlayerError(false);
    };
    const handleError = () => {
      clearPlayerTimeout();
      setPlayerLoaded(true);
      setPlayerError(true);
    };

    video.addEventListener('loadedmetadata', handleReady);
    video.addEventListener('canplay', handleReady);
    video.addEventListener('error', handleError);

    if (sourceMode === 'hls') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      } else if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
        });
        hls.on(Hls.Events.MANIFEST_PARSED, handleReady);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) handleError();
        });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else {
        handleError();
      }
    } else {
      video.src = src;
    }
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleReady);
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('error', handleError);
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [clearPlayerTimeout, playerReloadKey, sourceMode, src]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // 监听全屏状态
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // 上一集/下一集
  const canPrev = episode != null && episode > 1;
  const canNext = episode != null && totalEpisodes != null && episode < totalEpisodes;
  const goPrev = () => {
    if (canPrev && onEpisodeChange && episode) onEpisodeChange(episode - 1);
  };
  const goNext = () => {
    if (canNext && onEpisodeChange && episode) onEpisodeChange(episode + 1);
  };

  // 快捷键仅在播放器自身获得焦点时生效，避免干扰页面浏览。
  const handlePlayerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLButtonElement
      || target instanceof HTMLAnchorElement
      || target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target instanceof HTMLIFrameElement
      || target instanceof HTMLElement && target.isContentEditable
    ) return;

    if (event.key === 'Escape') {
      setShowEpisodePanel(false);
      setShowSourcePanel(false);
      return;
    }
    if ((event.key === 'f' || event.key === 'F') && isPlayable) {
      event.preventDefault();
      toggleFullscreen();
    }
    if (event.key === 'ArrowLeft' || event.key === '[') {
      event.preventDefault();
      if (episode != null && episode > 1 && onEpisodeChange) {
        onEpisodeChange(episode - 1);
      }
    }
    if (event.key === 'ArrowRight' || event.key === ']') {
      event.preventDefault();
      if (episode != null && totalEpisodes != null && episode < totalEpisodes && onEpisodeChange) {
        onEpisodeChange(episode + 1);
      }
    }
  };

  const displayTitle = episode ? `第${episode}${episodeLabel}` : title;

  return (
    <div className="w-full animate-fade-in-up stagger-5">
      {/* 播放器容器 */}
      <div
        ref={containerRef}
        tabIndex={isPlayable ? 0 : -1}
        onKeyDown={handlePlayerKeyDown}
        role="region"
        aria-label={`${displayTitle} 播放器`}
        className="relative w-full bg-black rounded-xl overflow-hidden shadow-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ aspectRatio: '16/9' }}
      >
        {/* 播放源 */}
        {src ? (
          sourceMode === 'external-page' ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              {cover && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
                  style={{ backgroundImage: `url(${cover})` }}
                />
              )}
              <div className="relative flex max-w-md flex-col items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">该播放源需在来源网站打开</h3>
                <p className="text-sm leading-6 text-white/65">来源页面禁止站内嵌入，点击后将在新标签页打开。</p>
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  前往来源网站观看
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          ) : sourceMode === 'invalid' ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div>
                <p className="text-base font-semibold text-white">播放源地址无效</p>
                <p className="mt-2 text-sm text-white/60">请选择其他播放源。</p>
              </div>
            </div>
          ) : (
            <>
            {/* 加载状态 */}
            {(!playerLoaded || loading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
                {cover && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
                    style={{ backgroundImage: `url(${cover})` }}
                  />
                )}
                <div className="relative flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
                  <p className="text-sm text-white/70">正在加载播放源...</p>
                </div>
              </div>
            )}

            {sourceMode === 'hls' || sourceMode === 'video' ? (
              <video
                key={`${src}-${playerReloadKey}`}
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                poster={cover}
                className="h-full w-full bg-black object-contain"
                aria-label={`${displayTitle} 在线播放`}
              />
            ) : (
              <iframe
                key={`${src}-${playerReloadKey}`}
                src={src}
                title={`${displayTitle} 在线播放`}
                className="h-full w-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                onLoad={() => {
                  clearPlayerTimeout();
                  setPlayerLoaded(true);
                  setPlayerError(false);
                }}
                onError={() => {
                  clearPlayerTimeout();
                  setPlayerLoaded(true);
                  setPlayerError(true);
                }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}

            {/* 加载失败 */}
            {playerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <CircleAlert aria-hidden className="mb-3 h-9 w-9 text-white/70" />
                <p className="mb-3 text-sm text-white/70">播放源加载失败，可重试或返回来源页。</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerError(false);
                      setPlayerLoaded(false);
                      setPlayerReloadKey((key) => key + 1);
                    }}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    重新加载
                  </button>
                  {fallbackUrl && (
                    <a
                      href={fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      打开来源页
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 顶部信息栏 */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent opacity-100 transition-opacity z-10 pointer-events-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate drop-shadow">{displayTitle}</span>
                  {rating && rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-accent/80 text-white shrink-0">
                      <Star aria-hidden className="h-3 w-3 fill-current" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 底部控制栏 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-100 transition-opacity z-10 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <div className="flex items-center justify-between gap-2">
                {/* 左侧：集数导航 */}
                {totalEpisodes && totalEpisodes > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!canPrev}
                      aria-label="上一集"
                      className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="上一集"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 20L9 12l10-8v16z"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEpisodePanel(!showEpisodePanel);
                        setShowSourcePanel(false);
                      }}
                      aria-expanded={showEpisodePanel}
                      aria-controls={`player-episodes-${contentType}-${contentId}`}
                      className="min-h-9 px-2 py-1 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {episode ? `第${episode}${episodeLabel}` : '选集'}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canNext}
                      aria-label="下一集"
                      className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="下一集"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4l10 8-10 8V4z"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    </button>
                  </div>
                )}

                {/* 右侧：播放源 + 全屏 */}
                <div className="flex items-center gap-1">
                  {sources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSourcePanel(!showSourcePanel);
                        setShowEpisodePanel(false);
                      }}
                      aria-expanded={showSourcePanel}
                      aria-controls={`player-sources-${contentType}-${contentId}`}
                      className="min-h-9 px-2 py-1 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      换源
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    title={isFullscreen ? '退出全屏 (F)' : '全屏 (F)'}
                  >
                    {isFullscreen ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 选集面板 */}
            {showEpisodePanel && totalEpisodes && totalEpisodes > 0 && (
              <div id={`player-episodes-${contentType}-${contentId}`} className="absolute bottom-14 left-3 right-3 max-h-[55%] bg-black/90 backdrop-blur-sm rounded-xl p-3 overflow-y-auto z-20 animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">选集 ({totalEpisodes}{episodeLabel})</h4>
                  <button type="button" aria-label="关闭选集面板" onClick={() => setShowEpisodePanel(false)} className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                  {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                    <button
                      type="button"
                      key={ep}
                      onClick={() => {
                        onEpisodeChange?.(ep);
                        setShowEpisodePanel(false);
                      }}
                      aria-current={ep === episode ? 'true' : undefined}
                      className={`min-h-9 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        ep === episode
                          ? 'bg-accent text-white shadow'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {ep}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 换源面板 */}
            {showSourcePanel && sources.length > 0 && (
              <div id={`player-sources-${contentType}-${contentId}`} className="absolute bottom-14 left-3 right-3 bg-black/90 backdrop-blur-sm rounded-xl p-3 z-20 animate-fade-in-up sm:left-auto sm:w-64">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">切换播放源</h4>
                  <button type="button" aria-label="关闭换源面板" onClick={() => setShowSourcePanel(false)} className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="space-y-1">
                  {sources.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        onSourceChange?.(s);
                        setShowSourcePanel(false);
                      }}
                      aria-pressed={s.sourceUrl === src}
                      className={`w-full min-h-10 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        s.sourceUrl === src
                          ? 'bg-accent text-white'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {s.sourceName || `来源 ${s.id}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          )
        ) : (
          /* 无播放源 */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {cover && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
                style={{ backgroundImage: `url(${cover})` }}
              />
            )}
            <div className="relative flex flex-col items-center gap-3">
              <Clapperboard aria-hidden className="h-10 w-10 text-white/60" />
              <p className="text-sm text-white/70">
                {loading
                  ? '正在加载播放资源...'
                  : sources.length > 0
                    ? '请从下方选择播放源'
                    : '暂无可用播放源'}
              </p>
              {loading && (
                <div className="w-8 h-8 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      {src && isPlayable && (
        <div className="mt-2 hidden items-center justify-center gap-4 text-xs text-muted-foreground sm:flex">
          <span>聚焦播放器后 <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">F</kbd> 全屏</span>
          {totalEpisodes && totalEpisodes > 1 && (
            <>
              <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">←</kbd> 上一集</span>
              <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">→</kbd> 下一集</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
