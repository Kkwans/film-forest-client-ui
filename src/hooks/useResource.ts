import { useState, useEffect } from 'react';
import { resourceApi } from '@/lib/api';

// Raw response shape from Promise.allSettled
interface SettledResponse {
  data?: unknown;
  status?: number;
}

export interface OnlineResource {
  id: number;
  sourceName: string;
  sourceUrl: string;
  sort?: number;
}

export interface MagnetResource {
  id: number;
  title: string;
  magnetUrl: string;
  resolution?: string;
  hasSubtitle?: boolean;
  isSpecialSub?: boolean;
  sort?: number;
}

export interface CloudResource {
  id: number;
  title: string;
  shareUrl: string;
  password?: string;
  storageName?: string;
}

function extractData(res: SettledResponse): unknown[] {
  const data = (res as { data: { data?: unknown[] } })?.data?.data || (res as { data: unknown[] })?.data || [];
  return Array.isArray(data) ? data : [];
}

export function useResource(contentType: string, contentId: number, episodeId?: number) {
  const [onlineResources, setOnlineResources] = useState<OnlineResource[]>([]);
  const [magnetResources, setMagnetResources] = useState<MagnetResource[]>([]);
  const [cloudResources, setCloudResources] = useState<CloudResource[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResources = async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const [onlineRes, magnetRes, cloudRes] = await Promise.allSettled([
        resourceApi.online(contentType, contentId, episodeId),
        resourceApi.magnet(contentType, contentId, episodeId),
        resourceApi.cloud(contentType, contentId, episodeId),
      ]);

      if (onlineRes.status === 'fulfilled') {
        setOnlineResources(extractData(onlineRes.value as SettledResponse) as OnlineResource[]);
      }
      if (magnetRes.status === 'fulfilled') {
        setMagnetResources(extractData(magnetRes.value as SettledResponse) as MagnetResource[]);
      }
      if (cloudRes.status === 'fulfilled') {
        setCloudResources(extractData(cloudRes.value as SettledResponse) as CloudResource[]);
      }
    } catch (e) {
      console.error('[useResource] fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [contentType, contentId, episodeId]);

  return {
    onlineResources,
    magnetResources,
    cloudResources,
    loading,
    refetch: fetchResources,
  };
}