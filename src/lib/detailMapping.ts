import { parseJsonArr } from '@/lib/contentConstants';
import { cleanStoryline, parseRegion } from '@/lib/utils';

export interface SharedDetailItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string;
  rating?: number;
  scoreDoubanCount?: number;
  scoreImdbCount?: number;
  scoreRtCriticCount?: number;
  scoreRtAudienceCount?: number;
  ratingCount?: number;
  ratingImdb?: number;
  ratingRT?: number;
  summary: string;
  status?: string;
  totalEpisode?: number;
  currentEpisode?: number;
  duration?: number;
  genre: string[];
  director: string[];
  writer: string[];
  actor: string[];
  language: string[];
  alias: string[];
  seriesName?: string;
  seriesOrder?: number;
  releaseDate?: string;
  updatedAt?: string;
  tmdbId?: number;
  tmdbMediaType?: string;
  tmdbMatchStatus?: string;
  tmdbDiagnosticCode?: string;
  tmdbPosterUrl?: string;
  tmdbScore?: number;
  tmdbVoteCount?: number;
}

type RawRecord = Record<string, unknown>;

function firstDefined(record: RawRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) && result > 0 ? result : undefined;
}

function toStringValue(value: unknown): string | undefined {
  return value == null || value === '' ? undefined : String(value);
}

function toArray(value: unknown): string[] {
  const clean = (entries: unknown[]) => entries
    .map((entry) => String(entry).trim().replace(/^['"]|['"]$/g, ''))
    .filter((entry) => entry && !/^(?:\[\]|\{\}|null|undefined|暂无|--|—)$/iu.test(entry));

  if (Array.isArray(value)) {
    return clean(value);
  }
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return clean(parsed);
    if (typeof parsed === 'string') return clean([parsed]);
  } catch {
    // 继续按历史来源的分隔符解析。
  }
  const parsed = parseJsonArr(raw);
  if (parsed.length > 0) return clean(parsed);
  return clean(raw.split(/\s*(?:\/|,|，|、|\|)\s*/u));
}

/** 将详情 API 的历史/新字段统一为详情页契约。 */
export function mapDetailData(item: RawRecord, contentType: string): SharedDetailItem {
  const totalEpisode = toNumber(item.totalEpisode);
  const currentEpisode = toNumber(item.currentEpisode);
  const episodeStatus = contentType === 'movie'
    ? undefined
    : totalEpisode && currentEpisode && currentEpisode < totalEpisode ? '更新中' : totalEpisode ? '已完结' : undefined;
  const nestedTmdb = (item.tmdb || item.tmdbMatch || item.posterMatch) as RawRecord | undefined;

  const alias = toArray(firstDefined(item, ['alias', 'aka', 'alsoKnownAs']));
  const writer = toArray(firstDefined(item, ['writer', 'writers', 'screenwriter']));
  const scoreDoubanCount = toNumber(firstDefined(item, [
    'scoreDoubanCount', 'scoreDoubanVotes', 'doubanRatingCount', 'doubanVotes',
    'ratingCount',
  ]));
  const scoreImdbCount = toNumber(firstDefined(item, [
    'scoreImdbCount', 'imdbRatingCount', 'imdbVoteCount', 'imdbVotes',
  ]));
  const scoreRtCriticCount = toNumber(firstDefined(item, [
    'scoreRtCriticCount', 'rtCriticCount', 'rtCriticVotes',
  ]));
  const scoreRtAudienceCount = toNumber(firstDefined(item, [
    'scoreRtAudienceCount', 'rtAudienceCount', 'rtAudienceVotes',
  ]));
  const tmdbId = toNumber(firstDefined(item, ['tmdbId', 'tmdb_id']) ?? nestedTmdb?.tmdbId);
  const tmdbMediaType = toStringValue(firstDefined(item, ['tmdbMediaType', 'tmdb_media_type']) ?? nestedTmdb?.tmdbMediaType);
  const tmdbMatchStatus = toStringValue(firstDefined(item, ['tmdbMatchStatus', 'posterMatchStatus', 'matchStatus']) ?? nestedTmdb?.matchStatus);
  const tmdbDiagnosticCode = toStringValue(firstDefined(item, ['tmdbDiagnosticCode', 'posterDiagnosticCode', 'diagnosticCode']) ?? nestedTmdb?.diagnosticCode);
  const tmdbPosterUrl = toStringValue(firstDefined(item, ['tmdbPosterUrl', 'posterTmdbUrl']) ?? nestedTmdb?.posterUrl);
  const tmdbScore = toNumber(firstDefined(item, ['tmdbScore', 'tmdb_score']) ?? nestedTmdb?.tmdbScore ?? nestedTmdb?.score);
  const tmdbVoteCount = toNumber(firstDefined(item, ['tmdbVoteCount', 'tmdb_vote_count']) ?? nestedTmdb?.tmdbVoteCount ?? nestedTmdb?.voteCount);

  return {
    id: Number(item.id),
    title: String(item.title || ''),
    cover: String(item.posterUrl || item.cover || ''),
    year: Number(item.year || 0),
    region: parseRegion(item.region).join(' / '),
    rating: toNumber(item.scoreDouban ?? item.rating),
    scoreDoubanCount,
    scoreImdbCount,
    scoreRtCriticCount,
    scoreRtAudienceCount,
    ratingCount: scoreDoubanCount,
    ratingImdb: toNumber(item.scoreImdb ?? item.ratingImdb),
    ratingRT: toNumber(item.scoreRt ?? item.scoreRT ?? item.ratingRT),
    summary: cleanStoryline(String(item.storyline || item.summary || '')),
    status: episodeStatus,
    totalEpisode,
    currentEpisode,
    duration: toNumber(item.duration),
    genre: toArray(item.genre),
    director: toArray(item.director),
    writer,
    actor: toArray(item.actor),
    language: toArray(item.language),
    alias,
    seriesName: toStringValue(item.seriesName ?? item.series_name),
    seriesOrder: toNumber(item.seriesOrder ?? item.series_order),
    releaseDate: toStringValue(item.releaseDate ?? item.release_date),
    updatedAt: toStringValue(item.updatedAt),
    tmdbId,
    tmdbMediaType,
    tmdbMatchStatus,
    tmdbDiagnosticCode,
    tmdbPosterUrl,
    tmdbScore,
    tmdbVoteCount,
  };
}
