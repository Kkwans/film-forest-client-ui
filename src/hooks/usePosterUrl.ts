'use client';

import { useEffect, useState } from 'react';
import { posterApi, type PosterResolution } from '@/lib/userApi';
import { normalizeContentType } from '@/lib/contentConstants';
import { useUserStore } from '@/stores/userStore';

interface ActivePoster {
  cacheKey: string;
  contentType: string;
  contentId: number;
  enrich: boolean;
}

type Subscriber = (posterUrl: string | null) => void;

const cache = new Map<string, string | null>();
const active = new Map<string, ActivePoster>();
const subscribers = new Map<string, Set<Subscriber>>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let invalidationReady = false;

function keyOf(identityKey: string, contentType: string, contentId: number) {
  return `${identityKey}:${normalizeContentType(contentType)}:${contentId}`;
}

function publish(key: string, result: PosterResolution) {
  const posterUrl = result.source === 'tmdb' ? result.posterUrl : null;
  cache.set(key, posterUrl);
  subscribers.get(key)?.forEach(subscriber => subscriber(posterUrl));
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
  const requests = keys.map(key => active.get(key)).filter((item): item is ActivePoster => Boolean(item));
  const enrich = requests.filter(item => item.enrich);
  const resolve = requests.filter(item => !item.enrich);

  for (let offset = 0; offset < resolve.length; offset += 100) {
    const batch = resolve.slice(offset, offset + 100);
    try {
      const response = await posterApi.resolve(batch.map(({ contentType, contentId }) => ({ contentType, contentId })));
      response.data.data.forEach(result => {
        const request = batch.find(item => (
          item.contentId === result.contentId
          && item.contentType === normalizeContentType(result.contentType)
        ));
        if (request) publish(request.cacheKey, result);
      });
    } catch {
      // Silent original-poster fallback is the contract for display resolution failures.
    }
  }

  await Promise.all(enrich.map(async item => {
    try {
      const response = await posterApi.enrich(item.contentType, item.contentId);
      publish(item.cacheKey, response.data.data);
    } catch {
      // The source poster remains visible when the explicit enrichment request fails.
    }
  }));
}

function ensureInvalidationListener() {
  if (invalidationReady || typeof window === 'undefined') return;
  invalidationReady = true;
  window.addEventListener('poster-settings-changed', () => {
    cache.clear();
    active.forEach((_, key) => {
      subscribers.get(key)?.forEach(subscriber => subscriber(null));
      schedule(key);
    });
  });
}

export function usePosterUrl(contentType: string, contentId: number, originalUrl?: string,
                             options: { enrich?: boolean } = {}) {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const userId = useUserStore(state => state.user?.id ?? null);
  const identityKey = isAuthenticated && userId ? `user:${userId}` : 'anonymous';
  const normalizedContentType = normalizeContentType(contentType);
  const key = keyOf(identityKey, normalizedContentType, contentId);
  const [overrideState, setOverrideState] = useState<{ cacheKey: string; posterUrl: string | null }>(() => ({
    cacheKey: key,
    posterUrl: cache.get(key) ?? null,
  }));
  const override = overrideState.cacheKey === key ? overrideState.posterUrl : null;
  const enrich = options.enrich === true;

  useEffect(() => {
    ensureInvalidationListener();
    if (!isAuthenticated || !userId) {
      return;
    }
    const subscriber: Subscriber = posterUrl => setOverrideState({ cacheKey: key, posterUrl });
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
    if (cache.has(key)) subscriber(cache.get(key) ?? null);
    if (!cache.has(key) || (enrich && cache.get(key) === null)) schedule(key);

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

  return override || originalUrl || '/poster-placeholder.svg';
}
