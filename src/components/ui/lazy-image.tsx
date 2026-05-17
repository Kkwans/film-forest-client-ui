'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Placeholder shown while loading (default: blur skeleton) */
  placeholder?: 'blur' | 'skeleton' | 'none';
  /** Aspect ratio for skeleton placeholder. Set to undefined to skip (when parent constrains size) */
  aspectRatio?: string | null;
  /** Fallback image URL on error */
  fallbackSrc?: string;
  /** Whether to use IntersectionObserver (default: true) */
  lazy?: boolean;
  /** Root margin for IntersectionObserver (default: '200px') */
  rootMargin?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: () => void;
  /** Additional class for the inner <img> element */
  imgClassName?: string;
  /** Style prop */
  style?: React.CSSProperties;
}

/**
 * LazyImage - Optimized image component with:
 * - IntersectionObserver-based lazy loading
 * - Blur-up placeholder transition
 * - Error fallback with retry
 * - Skeleton placeholder option
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'blur',
  aspectRatio = '2/3',
  fallbackSrc,
  lazy = true,
  rootMargin = '200px',
  onLoad,
  onError,
  imgClassName,
  style,
}: LazyImageProps) {
  const [inView, setInView] = useState(!lazy);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || inView) return;
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, inView, rootMargin]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryCount < 1 && src) {
      // Retry once (network glitch)
      setRetryCount((c) => c + 1);
      return;
    }
    setError(true);
    setLoaded(true);
    onError?.();
  }, [retryCount, src, onError]);

  // Determine actual src to display
  const displaySrc = error && fallbackSrc ? fallbackSrc : src;
  // Force re-render on retry by appending cache buster
  const imgSrc = retryCount > 0 && !error ? `${displaySrc}${displaySrc.includes('?') ? '&' : '?'}_retry=${retryCount}` : displaySrc;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio, ...style } : style}
    >
      {/* Skeleton placeholder */}
      {placeholder === 'skeleton' && !loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Blur placeholder */}
      {placeholder === 'blur' && !loaded && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundColor: 'var(--bg-card)',
            opacity: loaded ? 0 : 1,
          }}
        />
      )}

      {/* Actual image */}
      {inView && (
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName || ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}

      {/* Error state */}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}
