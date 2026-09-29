import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  adminPassword,
  cookieSecure,
  sessionPassword,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionData,
} from "./auth-config";
import { NextResponse } from "next/server";

export type { SessionData };

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    password: sessionPassword(),
    cookieName: SESSION_COOKIE,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure(),
      path: "/",
    },
  });
}

export async function isAdmin(): Promise<boolean> {
  return Boolean((await getSession()).admin);
}

/** For route handlers: a 401 response when the app is locked, otherwise null. The proxy checks too. */
export async function denyUnlessAdmin(): Promise<NextResponse | null> {
  return (await isAdmin()) ? null : NextResponse.json({ error: "Locked" }, { status: 401 });
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
