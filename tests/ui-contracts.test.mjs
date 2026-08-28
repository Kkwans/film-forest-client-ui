import assert from 'node:assert/strict';
import test from 'node:test';

import { mapDetailData } from '../src/lib/detailMapping.ts';
import {
  createSingleDoubleClickGuard,
  filterResourcesByDiskType,
  formatWatchedAt,
  fractionalStarFill,
  getGenreColorToken,
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

test('legacy profile tabs map to the archive-style routes', () => {
  assert.equal(profileRouteFromLegacyTab('lists'), '/profile/lists');
  assert.equal(profileRouteFromLegacyTab('history'), '/profile/lists?status=watched');
  assert.equal(profileRouteFromLegacyTab('settings'), '/profile/settings');
  assert.equal(profileRouteFromLegacyTab('unknown'), null);
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

test('movie card single and double clicks remain mutually exclusive', () => {
  let nextTimer = 0;
  const timers = new Map();
  const singles = [];
  const doubles = [];
  const guard = createSingleDoubleClickGuard(
    () => singles.push(1),
    () => doubles.push(1),
    240,
    (callback) => {
      const id = ++nextTimer;
      timers.set(id, callback);
      return id;
    },
    (timer) => timers.delete(timer),
  );

  guard.handle();
  guard.handle();
  assert.deepEqual(singles, []);
  assert.deepEqual(doubles, [1]);
  assert.equal(timers.size, 0);

  guard.handle();
  const pending = timers.values().next().value;
  assert.equal(typeof pending, 'function');
  pending();
  assert.deepEqual(singles, [1]);
  guard.dispose();
});
