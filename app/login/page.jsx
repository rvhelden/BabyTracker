import { redirect } from 'next/navigation';
import { getUser } from '../../lib/session.js';
import LoginForm from '../../components/LoginForm.jsx';

export default async function LoginPage({ searchParams }) {
  const user = await getUser();
  const params = await searchParams;
  if (user) redirect(params.from || '/');

  return <LoginForm from={params.from || '/'} />;
}
