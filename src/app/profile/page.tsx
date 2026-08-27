import { redirect } from 'next/navigation';
import ProfileClient from '@/components/ProfileClient';
import { profileRouteFromLegacyTab } from '@/lib/uiContracts';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const legacyRoute = profileRouteFromLegacyTab(tab);
  if (legacyRoute) redirect(legacyRoute);
  return <ProfileClient view="home" />;
}
