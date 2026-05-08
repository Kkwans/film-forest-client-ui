// @ts-nocheck
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CATEGORIES = [
  {
    type: 'movie',
    label: '电影',
    icon: '🎬',
    desc: '最新最热电影资源',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    href: '/movie',
  },
  {
    type: 'drama',
    label: '电视剧',
    icon: '📺',
    desc: '热播剧集追不停',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    href: '/drama',
  },
  {
    type: 'variety',
    label: '综艺',
    icon: '🎤',
    desc: '热门综艺节目大全',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    href: '/variety',
  },
  {
    type: 'anime',
    label: '动漫',
    icon: '🎌',
    desc: '精彩动漫世界',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    href: '/anime',
  },
  {
    type: 'short',
    label: '短剧',
    icon: '📱',
    desc: '短剧速看精彩不断',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    href: '/short',
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

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const results = await Promise.allSettled([
          fetch('/api/movies?page=1&size=1').then(r => r.json()),
          fetch('/api/dramas?page=1&size=1').then(r => r.json()),
          fetch('/api/varieties?page=1&size=1').then(r => r.json()),
          fetch('/api/animes?page=1&size=1').then(r => r.json()),
          fetch('/api/short-dramas?page=1&size=1').then(r => r.json()),
        ]);
        const get = (r: PromiseSettledResult<any>) =>
          r.status === 'fulfilled' ? (r.value?.data?.total || 0) : 0;
        setCounts({
          movie: get(results[0]),
          drama: get(results[1]),
          variety: get(results[2]),
          anime: get(results[3]),
          short: get(results[4]),
        });
      } catch {}
    };
    fetchCounts();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>全部分类</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>选择你想看的内容类型</p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {CATEGORIES.map((cat) => (
          <Link key={cat.type} href={cat.href} className="group block">
            <div
              className="relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl cursor-pointer"
              style={{ background: cat.gradient }}
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
                    {counts[cat.type as keyof CountData] > 0
                      ? `${counts[cat.type as keyof CountData]} 部内容`
                      : '加载中...'}
                  </span>
                  <span className="text-white/80 text-sm group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
