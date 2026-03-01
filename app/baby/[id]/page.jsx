import { notFound } from 'next/navigation';
import { getUser } from '../../../lib/session.js';
import { getBabyForUser, getWeightsForBaby } from '../../../lib/dal.js';
import AppLayout from '../../../components/AppLayout.jsx';
import BabyDetailClient from '../../../components/BabyDetailClient.jsx';

export default async function BabyDetailPage({ params }) {
  const { id } = await params;
  const user = await getUser();

  const baby = getBabyForUser(id, user.id);
  if (!baby) notFound();

  const weights = getWeightsForBaby(id, user.id) ?? [];

  return (
    <AppLayout user={user} showBack>
      <BabyDetailClient baby={baby} weights={weights} />
    </AppLayout>
  );
}
