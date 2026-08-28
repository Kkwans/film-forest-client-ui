import { redirect } from 'next/navigation';

export default async function ProfileArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) next.set(key, first);
  });
  if (!next.has('status')) next.set('status', 'watched');
  redirect(`/profile/lists?${next.toString()}`);
}
