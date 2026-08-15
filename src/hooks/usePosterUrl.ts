'use client';

import { useEffect, useState } from 'react';
import { posterApi, type PosterResolution } from '@/lib/userApi';
import { normalizeContentType } from '@/lib/contentConstants';
import { resolvePosterDisplay, type PosterDisplayStatus } from '@/lib/uiContracts';
import { useUserStore } from '@/stores/userStore';

interface ActivePoster {
  cacheKey: string;
  contentType: string;
  contentId: number;
  enrich: boolean;
}

export interface PosterResolutionView {
  posterUrl: string | null;
  status: PosterDisplayStatus | 'idle' | 'loading';
  diagnosticCode?: string | null;
  tmdbScore?: number | null;
  tmdbVoteCount?: number | null;
}

type Subscriber = (state: PosterResolutionView) => void;

const cache = new Map<string, PosterResolutionView>();
const active = new Map<string, ActivePoster>();
const subscribers = new Map<string, Set<Subscriber>>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let invalidationReady = false;

function keyOf(identityKey: string, contentType: string, contentId: number) {
  return `${identityKey}:${normalizeContentType(contentType)}:${contentId}`;
}

function notify(key: string, state: PosterResolutionView) {
  cache.set(key, state);
  subscribers.get(key)?.forEach((subscriber) => subscriber(state));
}

function publish(key: string, result: PosterResolution) {
  const display = resolvePosterDisplay('', result);
  notify(key, {
    posterUrl: result.source === 'tmdb' ? result.posterUrl : null,
    status: display.status,
    diagnosticCode: result.diagnosticCode,
    tmdbScore: result.tmdbScore,
    tmdbVoteCount: result.tmdbVoteCount,
  });
}

function publishFailure(key: string, diagnosticCode = 'service_unavailable') {
  notify(key, { posterUrl: null, status: 'unavailable', diagnosticCode });
}

function schedule(key: string) {
  queued.add(key);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 0);
}

async function flush() {
  const keys = Array.from(queued);
  queued.clear();
  const requests = keys.map((key) => active.get(key)).filter((item): item is ActivePoster => Boolean(item));
  const enrich = requests.filter((item) => item.enrich);
  const resolve = requests.filter((item) => !item.enrich);

  for (let offset = 0; offset < resolve.length; offset += 100) {
    const batch = resolve.slice(offset, offset + 100);
    try {
      const response = await posterApi.resolve(batch.map(({ contentType, contentId }) => ({ contentType, contentId })));
      const results = Array.isArray(response.data.data) ? response.data.data : [];
      results.forEach((result) => {
        const request = batch.find((item) => (
          item.contentId === result.contentId
          && item.contentType === normalizeContentType(result.contentType)
        ));
        if (request) publish(request.cacheKey, result);
      });
      batch.forEach((request) => {
        if (!cache.has(request.cacheKey)) notify(request.cacheKey, { posterUrl: null, status: 'fallback', diagnosticCode: 'not_matched' });
      });
    } catch {
      batch.forEach((request) => publishFailure(request.cacheKey, 'network_error'));
    }
  }

  await Promise.all(enrich.map(async (item) => {
    try {
      const response = await posterApi.enrich(item.contentType, item.contentId);
      publish(item.cacheKey, response.data.data);
    } catch {
      // Explicit enrichment failures keep the source poster visible and expose the real state.
      publishFailure(item.cacheKey);
    }
  }));
}

function ensureInvalidationListener() {
  if (invalidationReady || typeof window === 'undefined') return;
  invalidationReady = true;
  window.addEventListener('poster-settings-changed', () => {
    cache.clear();
    active.forEach((_, key) => {
      subscribers.get(key)?.forEach((subscriber) => subscriber({ posterUrl: null, status: 'loading' }));
      schedule(key);
    });
  });
}

export function usePosterResolution(
  contentType: string,
  contentId: number,
  originalUrl?: string,
  options: { enrich?: boolean } = {},
): PosterResolutionView & { url: string } {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.user?.id ?? null);
  const identityKey = isAuthenticated && userId ? `user:${userId}` : 'anonymous';
  const normalizedContentType = normalizeContentType(contentType);
  const key = keyOf(identityKey, normalizedContentType, contentId);
  const [overrideState, setOverrideState] = useState<{ cacheKey: string; value: PosterResolutionView }>(() => ({
    cacheKey: key,
    value: cache.get(key) ?? { posterUrl: null, status: 'idle' },
  }));
  const override = overrideState.cacheKey === key ? overrideState.value : { posterUrl: null, status: 'idle' as const };
  const enrich = options.enrich === true;

  useEffect(() => {
    ensureInvalidationListener();
    if (!isAuthenticated || !userId) return;

    const subscriber: Subscriber = (value) => setOverrideState({ cacheKey: key, value });
    const listeners = subscribers.get(key) || new Set<Subscriber>();
    listeners.add(subscriber);
    subscribers.set(key, listeners);
    const current = active.get(key);
    active.set(key, {
      cacheKey: key,
      contentType: normalizedContentType,
      contentId,
      enrich: enrich || current?.enrich === true,
    });
    if (cache.has(key)) subscriber(cache.get(key)!);
    if (!cache.has(key) || (enrich && cache.get(key)?.status !== 'tmdb')) {
      subscriber({ posterUrl: null, status: 'loading' });
      schedule(key);
    }

    return () => {
      const remaining = subscribers.get(key);
      remaining?.delete(subscriber);
      if (remaining?.size === 0) {
        subscribers.delete(key);
        active.delete(key);
        queued.delete(key);
      }
    };
  }, [contentId, enrich, identityKey, isAuthenticated, key, normalizedContentType, userId]);

  const url = override.posterUrl || originalUrl || '/poster-placeholder.svg';
  return { ...override, url };
}

export function usePosterUrl(
  contentType: string,
  contentId: number,
  originalUrl?: string,
  options: { enrich?: boolean } = {},
) {
  return usePosterResolution(contentType, contentId, originalUrl, options).url;
}
