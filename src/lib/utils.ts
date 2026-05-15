import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse region field from API response.
 * Handles: JSON string like '["美国"]', plain string '美国', array ['美国']
 * Returns: string[] like ['美国']
 */
// Dirty values that should be filtered from region field
const REGION_BLACKLIST = new Set([
  '制片国家/地区:', '制片国家/地区', '制片国家:', '制片国家',
  '地区:', '国家/地区:', '国家:',
]);

export function parseRegion(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(item => {
      if (typeof item === 'string' && item.startsWith('[')) {
        try { const parsed = JSON.parse(item); return Array.isArray(parsed) ? parsed : [item]; }
        catch { return [item]; }
      }
      return [item];
    }).filter(v => v && !REGION_BLACKLIST.has(v));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
    } catch { return [raw]; }
  }
  return [];
}

/**
 * Parse genre field from API response.
 * Handles: JSON string, array. Filters out language tags.
 * Returns: string[] like ['剧情', '喜剧']
 */
const LANGUAGE_TAGS = new Set([
  '英语', '国语', '日语', '韩语', '法语', '德语', '西班牙语', '意大利语',
  '葡萄牙语', '俄语', '泰语', '荷兰语', '瑞典语', '挪威语', '丹麦语',
  '芬兰语', '波兰语', '捷克语', '匈牙利语', '土耳其语', '阿拉伯语',
  '印地语', '印尼语', '越南语', '马来西亚语', '粤语', '闽南语', '普通话',
  '原声', '译制', '中文字幕', '英语字幕',
  // Non-Chinese language names that may appear in genre field
  '日本語', 'English', 'Japanese', 'Korean', 'French', 'German', 'Spanish',
  'Italian', 'Portuguese', 'Russian', 'Thai', 'Hindi', 'Turkish', 'Arabic',
]);

export function parseGenre(raw: unknown): string[] {
  if (!raw) return [];
  let arr: string[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    if (raw === '[]' || raw.trim() === '') return [];
    try {
      const parsed = JSON.parse(raw);
      arr = Array.isArray(parsed) ? parsed : [raw];
    } catch { arr = [raw]; }
  }
  return arr.filter(g => g && !LANGUAGE_TAGS.has(g));
}

/**
 * Clean title: remove year suffix like (2024)
 */
export function cleanTitle(title: string | null | undefined): string {
  if (!title) return '';
  return title.replace(/\(\d{4}\)\s*$/, '').trim();
}

/**
 * Clean storyline: remove trailing [] artifacts
 */
export function cleanStoryline(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\[\]\s*$/g, '').replace(/\[展开全部\]\s*/g, '').replace(/\[收起部分\]\s*/g, '').trim();
}
