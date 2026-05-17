'use client';

import { useEffect, useState } from 'react';
import { tagApi, type TagItem } from '@/lib/api';

interface TagFilterProps {
  /** 当前选中的标签ID */
  selectedTagId: number | null;
  /** 选择标签回调 */
  onSelect: (tagId: number | null) => void;
}

/**
 * 标签筛选组件
 * 展示热门标签列表，支持点击筛选
 */
export default function TagFilter({ selectedTagId, onSelect }: TagFilterProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tagApi
      .getHot(20)
      .then((res) => {
        const data = res.data?.data;
        setTags(Array.isArray(data) ? data : []);
      })
      .catch(() => setTags([]))
      .then(() => setLoading(false));
  }, []);

  if (loading || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
        style={{
          backgroundColor: selectedTagId === null ? 'var(--accent)' : 'var(--bg-card)',
          color: selectedTagId === null ? '#fff' : 'var(--text-secondary)',
          border: selectedTagId === null ? 'none' : '1px solid var(--border-color)',
        }}
      >
        全部标签
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(selectedTagId === tag.id ? null : tag.id)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor:
              selectedTagId === tag.id
                ? tag.color || 'var(--accent)'
                : 'var(--bg-card)',
            color: selectedTagId === tag.id ? '#fff' : 'var(--text-secondary)',
            border:
              selectedTagId === tag.id
                ? 'none'
                : `1px solid ${tag.color || 'var(--border-color)'}40`,
          }}
        >
          {tag.name}
          {tag.usageCount != null && tag.usageCount > 0 && (
            <span className="ml-1 opacity-60">{tag.usageCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
