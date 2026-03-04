import AppLayout from "../components/AppLayout.jsx";
import DashboardClient from "../components/DashboardClient.jsx";
import { getBabiesForUser } from "../lib/dal.js";
import { getUser } from "../lib/session.js";

export default async function DashboardPage() {
  const user = await getUser();
  const babies = getBabiesForUser(user.id);

  return (
    <AppLayout user={user}>
      <DashboardClient babies={babies} />
    </AppLayout>
  );
}
