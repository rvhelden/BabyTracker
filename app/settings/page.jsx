import { redirect } from "next/navigation";
import AppLayout from "../../components/AppLayout.jsx";
import SettingsClient from "../../components/SettingsClient.jsx";
import { getUser } from "../../lib/session.js";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <AppLayout user={user} showBack>
      <SettingsClient />
    </AppLayout>
  );
}
