'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * ScrollToTop - 浮动回到顶部按钮
 * - 滚动超过 400px 后显示
 * - 点击平滑滚动回顶部
 * - 移动端隐藏（底部导航已包含首页入口）
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      aria-label="回到顶部"
      className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
      style={{
        backgroundColor: 'var(--accent)',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
