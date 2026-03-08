import { notFound, redirect } from "next/navigation";
import AppLayout from "../../../components/AppLayout.jsx";
import BabyDetailClient from "../../../components/BabyDetailClient.jsx";
import {
  getBabyForUser,
  getDiaperEntriesForBaby,
  getGrowthEntriesForBaby,
  getMedicationEntriesForBaby,
  getMilkForBaby,
  getPredefinedMedicationsForBaby,
  getTemperatureEntriesForBaby,
} from "../../../lib/dal.js";
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

  const growthEntries = getGrowthEntriesForBaby(id, user.id) ?? [];
  const milkEntries = getMilkForBaby(id, user.id) ?? [];
  const diaperEntries = getDiaperEntriesForBaby(id, user.id) ?? [];
  const temperatureEntries = getTemperatureEntriesForBaby(id, user.id) ?? [];
  const medicationEntries = getMedicationEntriesForBaby(id, user.id) ?? [];
  const predefinedMedications = getPredefinedMedicationsForBaby(id, user.id) ?? [];

  return (
    <AppLayout user={user} showBack backHref='/?dashboard=1'>
      <BabyDetailClient
        baby={baby}
        growthEntries={growthEntries}
        milkEntries={milkEntries}
        diaperEntries={diaperEntries}
        temperatureEntries={temperatureEntries}
        medicationEntries={medicationEntries}
        predefinedMedications={predefinedMedications}
        locale={user.locale}
      />
    </AppLayout>
  );
}
