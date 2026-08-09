export interface ContentListQuery {
  page: number;
  size: number;
  genre?: string;
  region?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  tag?: number;
  hasResource?: boolean;
  sort: string;
  sortDir: 'asc' | 'desc';
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function parseContentListQuery(params: RawSearchParams): ContentListQuery {
  const year = positiveInt(first(params.year), 0, 9999) || undefined;
  const yearFrom = positiveInt(first(params.yearFrom), 0, 9999) || undefined;
  const yearTo = positiveInt(first(params.yearTo), 0, 9999) || undefined;
  const resourceFilter = first(params.hasResource);
  const hasResource = resourceFilter === 'true' ? true : resourceFilter === 'false' ? false : undefined;
  return {
    page: positiveInt(first(params.page), 1, 1_000_000),
    size: positiveInt(first(params.size), 24, 100),
    genre: first(params.genre) || undefined,
    region: first(params.region) || undefined,
    year,
    yearFrom: year ? undefined : yearFrom,
    yearTo: year ? undefined : yearTo,
    tag: positiveInt(first(params.tag), 0, Number.MAX_SAFE_INTEGER) || undefined,
    hasResource,
    sort: first(params.sort) || 'latest',
    sortDir: first(params.sortDir) === 'asc' ? 'asc' : 'desc',
  };
}

export function toContentListSearchParams(query: ContentListQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('size', String(query.size));
  if (query.genre) params.set('genre', query.genre);
  if (query.region) params.set('region', query.region);
  if (query.year) params.set('year', String(query.year));
  if (query.yearFrom) params.set('yearFrom', String(query.yearFrom));
  if (query.yearTo) params.set('yearTo', String(query.yearTo));
  if (query.tag) params.set('tag', String(query.tag));
  if (query.hasResource !== undefined) params.set('hasResource', String(query.hasResource));
  params.set('sort', query.sort);
  params.set('sortDir', query.sortDir);
  return params;
}
