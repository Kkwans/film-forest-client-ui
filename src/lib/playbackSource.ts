export type PlaybackSourceMode = 'embed' | 'external-page' | 'invalid';

/**
 * HTML/PHP 播放页通常通过 X-Frame-Options 禁止第三方嵌入，应作为外部页打开。
 * 其他 HTTP(S) 地址保留现有嵌入播放能力；非 HTTP(S) 协议不渲染为链接或 iframe。
 */
export function getPlaybackSourceMode(source?: string): PlaybackSourceMode {
  if (!source?.trim()) return 'invalid';
  try {
    const url = new URL(source);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid';
    return /\.(?:html?|php)$/i.test(url.pathname) ? 'external-page' : 'embed';
  } catch {
    return 'invalid';
  }
}
