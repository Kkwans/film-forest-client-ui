/** 列表、搜索和详情链接共用的筛选词，避免各页面维护分叉常量。 */
export const REGIONS = ['大陆', '美国', '日本', '韩国', '香港', '台湾', '英国', '法国', '德国', '印度', '泰国', '意大利', '西班牙', '加拿大', '澳大利亚'] as const;

export const LANGUAGES = ['中文', '英语', '日语', '韩语', '粤语', '法语', '德语', '西班牙语', '意大利语', '俄语', '泰语'] as const;

export const DECADES = [
  { label: '2020年代', from: 2020, to: 2029 },
  { label: '2010年代', from: 2010, to: 2019 },
  { label: '2000年代', from: 2000, to: 2009 },
  { label: '1990年代', from: 1990, to: 1999 },
  { label: '更早', from: 1900, to: 1989 },
] as const;

export function getYearOptions(currentYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 9 }, (_, index) => currentYear - index);
}
