import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionPassword } from "./auth-config";

/**
 * AES-256-GCM for mailbox credentials at rest. The key is derived from the same
 * secret as the session cookie, so changing SESSION_SECRET (or ADMIN_PASSWORD when
 * no SESSION_SECRET is set) makes saved mailboxes unreadable until re-added.
 */
function key(): Buffer {
  return createHash("sha256").update(`byeletter-data:${sessionPassword()}`).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const raw = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  return JSON.parse(text) as T;
}
