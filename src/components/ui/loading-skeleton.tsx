
'use client';

import { Skeleton } from './skeleton';

/**
 * 详情页加载骨架屏
 * 用于电影/剧集/综艺/动漫/短剧详情页的加载状态
 */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-6">
        <Skeleton className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 资源列表加载骨架屏
 * 用于磁力/网盘资源列表的加载状态
 */
export function ResourceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

/**
 * 卡片网格加载骨架屏
 * 用于电影/剧集列表页的加载状态
 */
export function CardGridSkeleton({ count = 12, cols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid ${cols} gap-3 md:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 搜索结果加载骨架屏
 */
export function SearchResultSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-border" >
          <Skeleton className="w-[80px] md:w-[110px] aspect-[2/3] rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 表单加载骨架屏
 */
export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-1/2 rounded-lg" />
    </div>
  );
}

/**
 * 统计卡片加载骨架屏
 */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border" >
          <Skeleton className="h-4 w-16 rounded mb-2" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}
