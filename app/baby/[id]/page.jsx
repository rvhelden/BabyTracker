import { notFound, redirect } from "next/navigation";
import AppLayout from "../../../components/AppLayout.jsx";
import BabyDetailClient from "../../../components/BabyDetailClient.jsx";
import { getBabyForUser, getMilkForBaby, getWeightsForBaby } from "../../../lib/dal.js";
import { getUser } from "../../../lib/session.js";

export default async function BabyDetailPage({ params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    redirect(`/login?from=/baby/${id}`);
  }

  const baby = getBabyForUser(id, user.id);
  if (!baby) {
    notFound();
  }

  const weights = getWeightsForBaby(id, user.id) ?? [];
  const milkEntries = getMilkForBaby(id, user.id) ?? [];

  return (
    <AppLayout user={user} showBack hideBottomNav>
      <BabyDetailClient baby={baby} weights={weights} milkEntries={milkEntries} />
    </AppLayout>
  );
}
