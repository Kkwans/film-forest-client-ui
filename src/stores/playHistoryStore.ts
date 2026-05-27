import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 播放记录项 */
export interface PlayHistoryItem {
  /** 内容 ID */
  contentId: number;
  /** 内容类型 movie/drama/anime/variety/short_drama */
  contentType: string;
  /** 内容标题 */
  title: string;
  /** 封面 URL */
  cover?: string;
  /** 当前集数（剧集/动漫用） */
  episode?: number;
  /** 集数标签 */
  episodeLabel?: string;
  /** 播放来源名称 */
  sourceName?: string;
  /** 播放 URL */
  sourceUrl?: string;
  /** 播放进度（秒） */
  progress?: number;
  /** 总时长（秒） */
  duration?: number;
  /** 最后播放时间戳 */
  lastPlayedAt: number;
  /** 年份 */
  year?: number;
  /** 评分 */
  rating?: number;
}

interface PlayHistoryState {
  /** 播放历史列表（按时间倒序，最近的在前） */
  history: PlayHistoryItem[];
  /** 添加/更新播放记录 */
  addOrUpdate: (item: Omit<PlayHistoryItem, 'lastPlayedAt'> & { lastPlayedAt?: number }) => void;
  /** 获取指定内容的播放记录 */
  getRecord: (contentId: number, contentType: string) => PlayHistoryItem | undefined;
  /** 删除指定记录 */
  remove: (contentId: number, contentType: string) => void;
  /** 清空历史 */
  clear: () => void;
  /** 更新播放进度 */
  updateProgress: (contentId: number, contentType: string, progress: number, duration?: number) => void;
  /** 获取最近播放（去重，最多 limit 条） */
  getRecent: (limit?: number) => PlayHistoryItem[];
}

const MAX_HISTORY = 100;

export const usePlayHistoryStore = create<PlayHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      addOrUpdate: (item) => {
        set((state) => {
          const now = Date.now();
          const existing = state.history.find(
            (h) => h.contentId === item.contentId && h.contentType === item.contentType
          );

          if (existing) {
            // 更新已有记录，移到最前
            const updated = state.history.filter(
              (h) => !(h.contentId === item.contentId && h.contentType === item.contentType)
            );
            return {
              history: [
                { ...existing, ...item, lastPlayedAt: item.lastPlayedAt ?? now },
                ...updated,
              ].slice(0, MAX_HISTORY),
            };
          }

          // 新增记录
          return {
            history: [
              { ...item, lastPlayedAt: item.lastPlayedAt ?? now },
              ...state.history,
            ].slice(0, MAX_HISTORY),
          };
        });
      },

      getRecord: (contentId, contentType) => {
        return get().history.find(
          (h) => h.contentId === contentId && h.contentType === contentType
        );
      },

      remove: (contentId, contentType) => {
        set((state) => ({
          history: state.history.filter(
            (h) => !(h.contentId === contentId && h.contentType === contentType)
          ),
        }));
      },

      clear: () => set({ history: [] }),

      updateProgress: (contentId, contentType, progress, duration) => {
        set((state) => {
          const idx = state.history.findIndex(
            (h) => h.contentId === contentId && h.contentType === contentType
          );
          if (idx === -1) return state;
          const updated = [...state.history];
          updated[idx] = {
            ...updated[idx],
            progress,
            ...(duration !== undefined ? { duration } : {}),
            lastPlayedAt: Date.now(),
          };
          return { history: updated };
        });
      },

      getRecent: (limit = 20) => {
        return get().history.slice(0, limit);
      },
    }),
    {
      name: 'ff-play-history',
      version: 1,
    }
  )
);
