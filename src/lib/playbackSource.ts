export type PlaybackSourceMode = 'hls' | 'video' | 'embed' | 'external-page' | 'invalid';

export type PlaybackType = 'HLS' | 'VIDEO' | 'EMBED' | 'EXTERNAL_PAGE' | string;

/**
 * HTML/PHP 播放页通常通过 X-Frame-Options 禁止第三方嵌入，应作为外部页打开。
 * 其他 HTTP(S) 地址保留现有嵌入播放能力；非 HTTP(S) 协议不渲染为链接或 iframe。
 */
export function getPlaybackSourceMode(source?: string, playbackType?: PlaybackType): PlaybackSourceMode {
  if (!source?.trim()) return 'invalid';
  try {
    const url = new URL(source);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid';

    switch (playbackType?.toUpperCase()) {
      case 'HLS':
        return 'hls';
      case 'VIDEO':
        return 'video';
      case 'EMBED':
        return 'embed';
      case 'EXTERNAL_PAGE':
        return 'external-page';
      default:
        break;
    }

    if (/\.m3u8$/i.test(url.pathname)) return 'hls';
    if (/\.(?:mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) return 'video';
    return /\.(?:html?|php)$/i.test(url.pathname) ? 'external-page' : 'embed';
  } catch {
    return 'invalid';
  }
}
