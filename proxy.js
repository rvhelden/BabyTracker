import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || "baby-tracker-session-secret-32chars!!xx",
  cookieName: "bt_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

const PUBLIC_PATHS = ["/login", "/signup", "/invite"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await getIronSession(request.cookies, SESSION_OPTIONS);
  if (!session.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.webmanifest|sw\\.js).*)"],
};
