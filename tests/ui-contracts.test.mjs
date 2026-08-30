import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { mapDetailData } from '../src/lib/detailMapping.ts';
import { CONTENT_SORT_CAPABILITIES } from '../src/lib/contentConstants.ts';
import { normalizeSearchRecord } from '../src/lib/api.ts';
import {
  filterResourcesByDiskType,
  formatWatchedAt,
  fractionalStarFill,
  getGenreColorToken,
  getPosterStatusMode,
  parseProfileArchiveQuery,
  profileRouteFromLegacyTab,
  resolvePosterDisplay,
} from '../src/lib/uiContracts.ts';

test('detail mapping normalizes aliases, writer, release date, rating counts and TMDB fields', () => {
  const mapped = mapDetailData({
    id: 42,
    title: '测试影片',
    posterUrl: '/posters/test.jpg',
    year: '2024',
    region: '["中国大陆","香港"]',
    scoreDouban: '7.5',
    scoreDoubanCount: '1234',
    scoreImdb: '8.1',
    scoreImdbCount: '5678',
    scoreRt: '82',
    scoreRtCriticCount: '210',
    scoreRtAudienceCount: '987',
    genre: '剧情/科幻',
    director: '导演甲',
    writer: '编剧甲 / 编剧乙',
    actor: '["主演甲"]',
    alias: 'Alias One / Alias Two',
    releaseDate: '2024-01-02',
    tmdb: {
      tmdbId: 550,
      tmdbMediaType: 'movie',
      matchStatus: 'matched',
      diagnosticCode: 'ok',
      posterUrl: 'https://image.tmdb.org/test.jpg',
      tmdbScore: 7.2,
      tmdbVoteCount: 3456,
    },
  }, 'movie');

  assert.deepEqual(mapped.alias, ['Alias One', 'Alias Two']);
  assert.deepEqual(mapped.writer, ['编剧甲', '编剧乙']);
  assert.deepEqual(mapped.genre, ['剧情', '科幻']);
  assert.equal(mapped.region, '中国大陆 / 香港');
  assert.equal(mapped.releaseDate, '2024-01-02');
  assert.equal(mapped.ratingCount, 1234);
  assert.equal(mapped.scoreDoubanCount, 1234);
  assert.equal(mapped.scoreImdbCount, 5678);
  assert.equal(mapped.scoreRtCriticCount, 210);
  assert.equal(mapped.scoreRtAudienceCount, 987);
  assert.equal(mapped.tmdbId, 550);
  assert.equal(mapped.tmdbMediaType, 'movie');
  assert.equal(mapped.tmdbMatchStatus, 'matched');
  assert.equal(mapped.tmdbPosterUrl, 'https://image.tmdb.org/test.jpg');
  assert.equal(mapped.tmdbScore, 7.2);
  assert.equal(mapped.tmdbVoteCount, 3456);
});

test('detail mapping leaves missing fields safe for placeholder rendering', () => {
  const mapped = mapDetailData({ id: 7, title: '缺失字段' }, 'movie');

  assert.deepEqual(mapped.alias, []);
  assert.deepEqual(mapped.writer, []);
  assert.deepEqual(mapped.genre, []);
  assert.deepEqual(mapped.director, []);
  assert.deepEqual(mapped.actor, []);
  assert.deepEqual(mapped.language, []);
  assert.equal(mapped.ratingCount, undefined);
  assert.equal(mapped.scoreDoubanCount, undefined);
  assert.equal(mapped.scoreImdbCount, undefined);
  assert.equal(mapped.scoreRtCriticCount, undefined);
  assert.equal(mapped.scoreRtAudienceCount, undefined);
  assert.equal(mapped.releaseDate, undefined);
  assert.equal(mapped.tmdbId, undefined);
  assert.equal(mapped.tmdbScore, undefined);
  assert.equal(mapped.tmdbVoteCount, undefined);
});

test('watchedAt uses relative labels without exposing a clock time', () => {
  const now = new Date(2026, 7, 15, 12, 0, 0, 0).getTime();

  assert.equal(formatWatchedAt(now - 30 * 1000, now), '刚刚');
  assert.equal(formatWatchedAt(now - 5 * 60 * 1000, now), '5分钟前');
  assert.equal(formatWatchedAt(now - 3 * 60 * 60 * 1000, now), '3小时前');
  assert.equal(formatWatchedAt(now - 2 * 24 * 60 * 60 * 1000, now), '2天前');
  assert.equal(formatWatchedAt(new Date(2026, 7, 1, 12).getTime(), now), '2026年8月1日');
  assert.equal(formatWatchedAt(undefined, now), '--');
});

test('fractional star fill follows score divided by two', () => {
  assert.equal(fractionalStarFill(7, 3), 0.5);
  assert.equal(fractionalStarFill(7.5, 3), 0.75);
  assert.equal(fractionalStarFill(7.5, 4), 0);
  assert.equal(fractionalStarFill(12, 0), 1);
});

test('genre color tokens distinguish semantic categories', () => {
  assert.equal(getGenreColorToken('恐怖'), 'horror');
  assert.equal(getGenreColorToken('惊悚'), 'thriller');
  assert.notEqual(getGenreColorToken('恐怖'), getGenreColorToken('惊悚'));
  assert.equal(getGenreColorToken('情色'), 'erotic');
  assert.equal(getGenreColorToken('科幻'), 'scifi');
});

test('poster status slot only toggles the want-to-watch state', () => {
  assert.equal(getPosterStatusMode(null), 'toggle-want');
  assert.equal(getPosterStatusMode('want_to_watch'), 'toggle-want');
  assert.equal(getPosterStatusMode('watching'), 'readonly');
  assert.equal(getPosterStatusMode('watched'), 'readonly');
  assert.equal(getPosterStatusMode('custom'), 'readonly');
});

test('content list uses the server taxonomy and keeps legacy filters out of the primary panel', () => {
  const tagFilterSource = readFileSync(new URL('../src/components/TagFilter.tsx', import.meta.url), 'utf8');
  const listSource = readFileSync(new URL('../src/app/movie/MovieListClient.tsx', import.meta.url), 'utf8');
  assert.equal(tagFilterSource.includes('MOVIE_SUPPLEMENTAL_GENRES'), false);
  assert.equal(listSource.includes('筛选条件已同步到地址栏'), false);
  assert.equal(listSource.includes('>资源状态<'), false);
  assert.match(listSource, /兼容筛选条件/);
});

test('header, profile and mobile navigation share one avatar owner', () => {
  for (const path of [
    '../src/components/Header.tsx',
    '../src/components/ProfileClient.tsx',
    '../src/components/MobileBottomNav.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /UserAvatar/);
  }
  const avatarSource = readFileSync(new URL('../src/components/ui/UserAvatar.tsx', import.meta.url), 'utf8');
  assert.match(avatarSource, /rounded-full/);
});

test('related content reuses the canonical movie card', () => {
  const source = readFileSync(new URL('../src/components/RelatedSection.tsx', import.meta.url), 'utf8');
  assert.match(source, /import MovieCard/);
  assert.equal(source.includes('function RelatedCard'), false);
  assert.match(source, /region=\{item\.region\}/);
  assert.match(source, /genre=\{item\.genre\}/);
});

test('detail metadata and resources follow the shared layout contracts', () => {
  const detailSource = readFileSync(new URL('../src/components/DetailPageLayout.tsx', import.meta.url), 'utf8');
  const componentSource = readFileSync(new URL('../src/components/detail/DetailComponents.tsx', import.meta.url), 'utf8');
  assert.equal(detailSource.includes('detail-maintenance-title'), false);
  assert.equal(detailSource.includes('group-hover:translate-x-0.5'), false);
  assert.equal(detailSource.includes('absolute bottom-0 right-0'), false);
  assert.match(detailSource, /downloadTab === 'online'[\s\S]*<EpisodeGrid/);
  assert.match(componentSource, /grid-cols-\[3\.5rem_minmax\(0,1fr\)\]/);
  assert.match(componentSource, /grid-cols-\[minmax\(0,1fr\)_7rem_9rem\]/);
  assert.equal(componentSource.includes('columnheader" className="text-right">入库时间'), false);
});

test('legacy profile tabs map to the archive-style routes', () => {
  assert.equal(profileRouteFromLegacyTab('lists'), '/profile/lists');
  assert.equal(profileRouteFromLegacyTab('history'), '/profile/lists?status=watched');
  assert.equal(profileRouteFromLegacyTab('settings'), '/profile/settings');
  assert.equal(profileRouteFromLegacyTab('unknown'), null);
});

test('collection workspace owns the canonical list route and responsive grid', () => {
  const workspaceSource = readFileSync(new URL('../src/components/CollectionWorkspace.tsx', import.meta.url), 'utf8');
  const legacySource = readFileSync(new URL('../src/app/user/lists/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(workspaceSource, /CollectionItemCard/);
  assert.match(workspaceSource, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(workspaceSource, /role="tablist"/);
  assert.match(workspaceSource, /listApi\.getItems/);
  assert.match(workspaceSource, /listApi\.batchRemoveItems/);
  assert.match(legacySource, /redirect\(`\/profile\/lists\?/);
  assert.equal(legacySource.includes('ListItemCard'), false);
});

test('profile dashboard consumes bounded overview projections and keeps empty states honest', () => {
  const dashboardSource = readFileSync(new URL('../src/components/ProfileDashboard.tsx', import.meta.url), 'utf8');
  const apiSource = readFileSync(new URL('../src/lib/userApi.ts', import.meta.url), 'utf8');
  assert.match(dashboardSource, /profileApi\.getOverview/);
  assert.match(dashboardSource, /ContinueWatching/);
  assert.match(dashboardSource, /items\.length === 0/);
  assert.match(apiSource, /\/api\/user\/profile\/overview/);
  assert.match(apiSource, /customListPreview/);
});

test('profile archive query parser applies safe defaults', () => {
  assert.deepEqual(parseProfileArchiveQuery({ status: 'watching', type: 'drama', page: '3', sort: 'year' }), {
    status: 'watching', type: 'drama', page: 3, sort: 'year',
  });
  assert.deepEqual(parseProfileArchiveQuery({ status: 'invalid', type: 'invalid', page: '-2', sort: 'invalid' }), {
    status: 'watched', type: '', page: 1, sort: 'addedAt',
  });
  assert.equal(parseProfileArchiveQuery({ status: 'watching', sort: 'userRating' }).sort, 'addedAt');
});

test('TMDB failure keeps the original poster and exposes truthful status', () => {
  const original = 'https://source.example/poster.jpg';
  const unmatched = resolvePosterDisplay(original, {
    source: 'original',
    matchStatus: 'not_matched',
    diagnosticCode: 'no_match',
  });
  const failed = resolvePosterDisplay(original, undefined, true);

  assert.equal(unmatched.url, original);
  assert.equal(unmatched.status, 'fallback');
  assert.equal(failed.url, original);
  assert.equal(failed.status, 'unavailable');
});

test('resource filter matches diskType and keeps all resources for the all selection', () => {
  const resources = [
    { id: 1, diskType: 'Quark' },
    { id: 2, diskType: 'baidu' },
    { id: 3, diskType: undefined },
  ];

  assert.deepEqual(filterResourcesByDiskType(resources, 'quark'), [resources[0]]);
  assert.deepEqual(filterResourcesByDiskType(resources, 'ALL'), resources);
});

test('content sort capabilities expose only supported options', () => {
  assert.deepEqual(CONTENT_SORT_CAPABILITIES.movie, ['latest', 'year', 'douban', 'imdb', 'rt']);
  assert.deepEqual(CONTENT_SORT_CAPABILITIES.drama, ['latest', 'year', 'douban', 'imdb']);
  assert.equal(CONTENT_SORT_CAPABILITIES.short_drama.includes('rt'), false);
});

test('search adapter normalizes wire aliases and truthful nullable scores', () => {
  const record = normalizeSearchRecord({
    id: '9',
    type: 'short',
    title: '短剧',
    posterUrl: '/poster.jpg',
    scoreDouban: '7.5',
    scoreRT: '82',
    updatedAt: '2026-08-30T10:00:00Z',
  });

  assert.equal(record.type, 'short_drama');
  assert.equal(record.cover, '/poster.jpg');
  assert.equal(record.rating, 7.5);
  assert.equal(record.ratingRT, 82);
  assert.equal(record.updatedAtMs, Date.parse('2026-08-30T10:00:00Z'));
  assert.equal(normalizeSearchRecord({ id: 1, type: 'unknown', title: '坏数据' }), null);
  assert.equal(normalizeSearchRecord({ id: 2, type: 'movie', title: '缺失评分', scoreDouban: null }).rating, null);
});

test('search and collection use the shared horizontal media shell', () => {
  const searchSource = readFileSync(new URL('../src/app/search/page.tsx', import.meta.url), 'utf8');
  const sharedSource = readFileSync(new URL('../src/components/ContentShared.tsx', import.meta.url), 'utf8');
  const collectionSource = readFileSync(new URL('../src/components/CollectionWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(sharedSource, /export function MediaHorizontalCard/);
  assert.match(sharedSource, /export function RatingSummary/);
  assert.match(searchSource, /MediaHorizontalCard/);
  assert.match(searchSource, /RatingSummary/);
  assert.equal(searchSource.includes('SearchRatingSummary'), false);
  assert.equal(searchSource.includes('pr-28'), false);
  assert.equal(searchSource.includes('pr-36'), false);
  assert.equal(searchSource.includes('absolute right-3 top-3'), false);
  assert.match(collectionSource, /MediaHorizontalCard/);
});
