import { redirect } from 'next/navigation';
import { getUser } from '../../lib/session.js';
import SignupForm from '../../components/SignupForm.jsx';

export default async function SignupPage() {
  const user = await getUser();
  if (user) redirect('/');

  return <SignupForm />;
}
