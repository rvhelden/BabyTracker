import { getUser } from '../lib/session.js';
import { getBabiesForUser } from '../lib/dal.js';
import AppLayout from '../components/AppLayout.jsx';
import DashboardClient from '../components/DashboardClient.jsx';

export default async function DashboardPage() {
  const user = await getUser();
  const babies = getBabiesForUser(user.id);

  return (
    <AppLayout user={user}>
      <DashboardClient babies={babies} />
    </AppLayout>
  );
}
