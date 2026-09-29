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
import type { MailAccount } from "./types";

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

/** The signed-in mailbox, only if the app has also been unlocked with the admin password. */
export async function requireAccount(): Promise<MailAccount | null> {
  const session = await getSession();
  return session.admin ? (session.account ?? null) : null;
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
