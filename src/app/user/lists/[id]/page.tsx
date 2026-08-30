import { redirect } from 'next/navigation';

type QueryValue = string | string[] | undefined;

function first(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Legacy list URLs now resolve to the single Collection Workspace. Keep the
 * useful pagination/filter query while preventing a second list-card tree
 * from drifting away from the canonical route.
 */
export default async function LegacyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, QueryValue>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const listId = Number(id);
  const next = new URLSearchParams();
  if (Number.isSafeInteger(listId) && listId > 0) next.set('listId', String(listId));

  const page = first(query.page);
  const sort = first(query.sort);
  const type = first(query.type) || first(query.contentType);
  if (page) next.set('page', page);
  if (sort) next.set('sort', sort);
  if (type) next.set('type', type);

  redirect(`/profile/lists?${next.toString()}`);
}
