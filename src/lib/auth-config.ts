// Shared by the proxy and route handlers, so it must not import "server-only".
import { createHash, randomBytes } from "node:crypto";
import type { MailAccount } from "./types";

export interface SessionData {
  /** Set once the ADMIN_PASSWORD has been entered on /unlock */
  admin?: boolean;
  account?: MailAccount;
}

export const SESSION_COOKIE = "byeletter_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || undefined;
}

let fallbackSecret: string | undefined;

/**
 * Key for the encrypted session cookie. SESSION_SECRET is preferred; otherwise
 * it is derived from ADMIN_PASSWORD so the proxy and route handlers (which may
 * be separate module instances) always agree on it.
 */
export function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  const admin = adminPassword();
  if (admin) return createHash("sha256").update(`byeletter-session:${admin}`).digest("hex");

  // No admin password means nobody can unlock the app, so sessions never matter.
  fallbackSecret ??= randomBytes(32).toString("hex");
  return fallbackSecret;
}

export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}
