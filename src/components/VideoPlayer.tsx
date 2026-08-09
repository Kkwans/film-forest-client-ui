'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayHistoryStore } from '@/stores/playHistoryStore';
import { getPlaybackSourceMode } from '@/lib/playbackSource';

/** 播放源 */
export interface PlayerSource {
  id: number;
  sourceName?: string;
  sourceUrl?: string;
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
  totalEpisodes,
  sources = [],
  onEpisodeChange,
  onSourceChange,
  loading = false,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const addOrUpdate = usePlayHistoryStore((s) => s.addOrUpdate);
  const sourceMode = getPlaybackSourceMode(src);

  // 记录播放历史
  useEffect(() => {
    if (src && sourceMode === 'embed') {
      addOrUpdate({
        contentId,
        contentType,
        title,
        cover,
        episode,
        episodeLabel,
        year,
        rating,
        sourceUrl: src,
        sourceName: sources.find((s) => s.sourceUrl === src)?.sourceName,
      });
    }
  }, [src, sourceMode, contentId, contentType, title, cover, episode, episodeLabel, year, rating, sources, addOrUpdate]);

  // iframe 加载状态
  useEffect(() => {
    if (src && sourceMode === 'embed') {
      setIframeLoaded(false);
      setIframeError(false);
      const timer = setTimeout(() => {
        setIframeLoaded(true); // 超时也标记为已加载
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [src, sourceMode]);

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

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'f' || e.key === 'F') && sourceMode === 'embed') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault();
        if (episode != null && episode > 1 && onEpisodeChange) {
          onEpisodeChange(episode - 1);
        }
      }
      if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault();
        if (episode != null && totalEpisodes != null && episode < totalEpisodes && onEpisodeChange) {
          onEpisodeChange(episode + 1);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleFullscreen, sourceMode, episode, totalEpisodes, onEpisodeChange]);

  const displayTitle = episode ? `第${episode}${episodeLabel}` : title;

  return (
    <div className="w-full animate-fade-in-up stagger-5">
      {/* 播放器容器 */}
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded-xl overflow-hidden shadow-xl group"
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
                  href={src}
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
            {(!iframeLoaded || loading) && (
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

            {/* iframe */}
            <iframe
              src={src}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />

            {/* 加载失败 */}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <p className="text-3xl mb-3">😵</p>
                <p className="text-sm text-white/70 mb-3">播放源加载失败</p>
                <button
                  onClick={() => {
                    setIframeError(false);
                    setIframeLoaded(false);
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  重新加载
                </button>
              </div>
            )}

            {/* 顶部信息栏 */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate drop-shadow">{displayTitle}</span>
                  {rating && rating > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/80 text-white shrink-0">
                      ⭐ {rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 底部控制栏 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="flex items-center justify-between gap-2">
                {/* 左侧：集数导航 */}
                {totalEpisodes && totalEpisodes > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      disabled={!canPrev}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="上一集"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 20L9 12l10-8v16z"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                    </button>
                    <button
                      onClick={() => setShowEpisodePanel(!showEpisodePanel)}
                      className="px-2 py-1 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {episode ? `第${episode}${episodeLabel}` : '选集'}
                    </button>
                    <button
                      onClick={goNext}
                      disabled={!canNext}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                      onClick={() => setShowSourcePanel(!showSourcePanel)}
                      className="px-2 py-1 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      换源
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
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
              <div className="absolute bottom-14 left-3 right-3 max-h-[40%] bg-black/90 backdrop-blur-sm rounded-xl p-3 overflow-y-auto z-20 animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">选集 ({totalEpisodes}{episodeLabel})</h4>
                  <button onClick={() => setShowEpisodePanel(false)} className="text-white/60 hover:text-white">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                  {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                    <button
                      key={ep}
                      onClick={() => {
                        onEpisodeChange?.(ep);
                        setShowEpisodePanel(false);
                      }}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              <div className="absolute bottom-14 right-3 w-64 bg-black/90 backdrop-blur-sm rounded-xl p-3 z-20 animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">切换播放源</h4>
                  <button onClick={() => setShowSourcePanel(false)} className="text-white/60 hover:text-white">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="space-y-1">
                  {sources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSourceChange?.(s);
                        setShowSourcePanel(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
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
              <p className="text-4xl">🎬</p>
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
      {src && sourceMode === 'embed' && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">F</kbd> 全屏</span>
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
