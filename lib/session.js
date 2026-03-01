import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'baby-tracker-session-secret-32chars!!xx',
  cookieName: 'bt_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

/** Call from Server Components, Server Actions, and Route Handlers. */
export async function getSession() {
  return getIronSession(await cookies(), sessionOptions);
}

/** Returns the logged-in user or null. */
export async function getUser() {
  const session = await getSession();
  return session.user ?? null;
}
