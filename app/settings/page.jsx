import { getUser } from '../../lib/session.js';
import AppLayout from '../../components/AppLayout.jsx';
import SettingsClient from '../../components/SettingsClient.jsx';

export default async function SettingsPage() {
  const user = await getUser();
  return (
    <AppLayout user={user} showBack>
      <SettingsClient />
    </AppLayout>
  );
}
