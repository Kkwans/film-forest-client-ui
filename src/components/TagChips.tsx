'use client';

import { useEffect, useState } from 'react';
import { tagApi, type TagItem } from '@/lib/api';

interface TagChipsProps {
  contentType: string;
  contentId: number;
  /** 最多显示几个标签 */
  max?: number;
  /** 点击标签的回调（用于筛选） */
  onTagClick?: (tag: TagItem) => void;
}

/**
 * 标签 Chips 组件
 * 展示内容关联的标签列表
 */
export default function TagChips({ contentType, contentId, max = 5, onTagClick }: TagChipsProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentId || !contentType) return;
    setLoading(true);
    tagApi
      .getContentTags(contentType, contentId)
      .then((res) => {
        const data = res.data?.data;
        setTags(Array.isArray(data) ? data.slice(0, max) : []);
      })
      .catch(() => setTags([]))
      .then(() => setLoading(false));
  }, [contentType, contentId, max]);

  if (loading || tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagClick?.(tag)}
          className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
            onTagClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
          }`}
          style={{
            backgroundColor: tag.color ? `${tag.color}18` : 'var(--accent-light)',
            color: tag.color || 'var(--accent)',
            border: `1px solid ${tag.color || 'var(--accent)'}30`,
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
