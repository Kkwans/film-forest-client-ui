'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { movieApi, dramaApi, varietyApi, animeApi, shortDramaApi, type Result } from '@/lib/api';
import type { AxiosResponse } from 'axios';

const CATEGORIES = [
  {
    type: 'movie',
    label: '电影',
    icon: '🎬',
    desc: '最新最热电影资源',
    href: '/movie',
    hue: 'from-emerald-500 to-teal-600',
  },
  {
    type: 'drama',
    label: '电视剧',
    icon: '📺',
    desc: '热播剧集追不停',
    href: '/drama',
    hue: 'from-blue-500 to-indigo-600',
  },
  {
    type: 'variety',
    label: '综艺',
    icon: '🎤',
    desc: '热门综艺节目大全',
    href: '/variety',
    hue: 'from-amber-500 to-orange-600',
  },
  {
    type: 'anime',
    label: '动漫',
    icon: '🎌',
    desc: '精彩动漫世界',
    href: '/anime',
    hue: 'from-pink-500 to-rose-600',
  },
  {
    type: 'short',
    label: '短剧',
    icon: '📱',
    desc: '短剧速看精彩不断',
    href: '/short',
    hue: 'from-violet-500 to-purple-600',
  },
];

interface CountData {
  movie: number;
  drama: number;
  variety: number;
  anime: number;
  short: number;
}

export default function CategoryPage() {
  const [counts, setCounts] = useState<CountData>({ movie: 0, drama: 0, variety: 0, anime: 0, short: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const results = await Promise.allSettled([
          movieApi.list({ page: 1, size: 1 }),
          dramaApi.list({ page: 1, size: 1 }),
          varietyApi.list({ page: 1, size: 1 }),
          animeApi.list({ page: 1, size: 1 }),
          shortDramaApi.list({ page: 1, size: 1 }),
        ]);
        const getTotal = (r: PromiseSettledResult<AxiosResponse<Result<unknown>>>): number =>
          r.status === 'fulfilled' ? ((r.value?.data?.data as { total?: number })?.total || 0) : 0;
        setCounts({
          movie: getTotal(results[0]),
          drama: getTotal(results[1]),
          variety: getTotal(results[2]),
          anime: getTotal(results[3]),
          short: getTotal(results[4]),
        });
      } catch { /* ignore */ }
      setLoaded(true);
    };
    fetchCounts();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">全部分类</h1>
        <p className="text-sm mt-2 text-secondary-foreground">选择你想看的内容类型</p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {CATEGORIES.map((cat, idx) => (
          <Link key={cat.type} href={cat.href} className="group block">
            <div
              className={`animate-fade-in-up stagger-${Math.min(idx + 1, 12)} relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl cursor-pointer bg-gradient-to-br ${cat.hue}`}
            >
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 bg-white" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10 bg-white" />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="text-4xl md:text-5xl">{cat.icon}</div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{cat.label}</h2>
                  <p className="text-sm text-white/80 mt-1">{cat.desc}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-white/60">
                    {!loaded ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white/80 rounded-full animate-spin" />
                        加载中
                      </span>
                    ) : counts[cat.type as keyof CountData] > 0 ? (
                      `${counts[cat.type as keyof CountData]} 部内容`
                    ) : (
                      '暂无内容'
                    )}
                  </span>
                  <svg className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
