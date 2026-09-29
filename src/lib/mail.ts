import "server-only";
import { ImapFlow } from "imapflow";
import Pop3Command from "node-pop3";
import { groupNewsletters, parseHeaderBlock, WANTED_HEADERS, type ParsedMessage } from "./newsletters";
import type { MailAccount, ScanResult } from "./types";

const TIMEOUT_MS = 30_000;
export const MAX_SCAN = 2000;

function imapClient(account: MailAccount) {
  return new ImapFlow({
    host: account.incoming.host,
    port: account.incoming.port,
    secure: account.incoming.secure,
    auth: { user: account.username, pass: account.password },
    logger: false,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS * 4,
    tls: account.allowSelfSigned ? { rejectUnauthorized: false } : undefined,
  });
}

function pop3Client(account: MailAccount) {
  return new Pop3Command({
    host: account.incoming.host,
    port: account.incoming.port,
    tls: account.incoming.secure,
    user: account.username,
    password: account.password,
    timeout: TIMEOUT_MS,
    tlsOptions: account.allowSelfSigned ? { rejectUnauthorized: false } : undefined,
  });
}

async function withImap<T>(account: MailAccount, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = imapClient(account);
  // Swallow late socket errors so they don't crash the process.
  client.on("error", () => {});
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

async function withPop3<T>(account: MailAccount, fn: (client: Pop3Command) => Promise<T>): Promise<T> {
  const client = pop3Client(account);
  try {
    return await fn(client);
  } finally {
    await client.QUIT().catch(() => {});
  }
}

/** Log in once to make sure the credentials work. Throws a readable error otherwise. */
export async function verifyAccount(account: MailAccount): Promise<void> {
  try {
    if (account.protocol === "imap") {
      await withImap(account, async () => {});
    } else {
      await withPop3(account, (c) => c.STAT());
    }
  } catch (err) {
    throw new Error(describeError(err));
  }
}

export async function listMailboxes(account: MailAccount): Promise<string[]> {
  if (account.protocol !== "imap") return ["INBOX"];
  return withImap(account, async (client) => {
    const boxes = await client.list();
    return boxes
      .filter((b) => !b.flags.has("\\Noselect"))
      .map((b) => b.path)
      .sort((a, b) => (a === "INBOX" ? -1 : b === "INBOX" ? 1 : a.localeCompare(b)));
  });
}

/** Scan the newest `limit` messages and return senders that include List-Unsubscribe. */
export async function scanNewsletters(
  account: MailAccount,
  opts: { limit: number; mailbox?: string },
): Promise<ScanResult> {
  const limit = Math.max(1, Math.min(opts.limit, MAX_SCAN));
  return account.protocol === "imap"
    ? scanImap(account, limit, opts.mailbox || "INBOX")
    : scanPop3(account, limit);
}

async function scanImap(account: MailAccount, limit: number, mailbox: string): Promise<ScanResult> {
  return withImap(account, async (client) => {
    const box = await client.mailboxOpen(mailbox, { readOnly: true });
    const total = box.exists;
    if (total === 0) return { newsletters: [], scanned: 0, total, mailbox };

    const start = Math.max(1, total - limit + 1);
    const parsed: ParsedMessage[] = [];
    let scanned = 0;
    for await (const msg of client.fetch(`${start}:*`, { headers: WANTED_HEADERS })) {
      scanned++;
      if (!msg.headers) continue;
      const result = await parseHeaderBlock(msg.headers).catch(() => null);
      if (result) parsed.push(result);
    }
    return { newsletters: groupNewsletters(parsed), scanned, total, mailbox };
  });
}

async function scanPop3(account: MailAccount, limit: number): Promise<ScanResult> {
  return withPop3(account, async (client) => {
    const stat = await client.STAT();
    const total = Number.parseInt(String(stat).trim().split(/\s+/)[0] ?? "0", 10) || 0;
    const parsed: ParsedMessage[] = [];
    let scanned = 0;
    // POP3 numbers messages 1..N, oldest first; walk backwards from the newest.
    for (let n = total; n >= 1 && scanned < limit; n--) {
      scanned++;
      const headers = await client.TOP(n, 0);
      if (typeof headers !== "string") continue;
      const result = await parseHeaderBlock(headers).catch(() => null);
      if (result) parsed.push(result);
    }
    return { newsletters: groupNewsletters(parsed), scanned, total, mailbox: "INBOX" };
  });
}

export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown error";
  const e = err as Error & { code?: string; authenticationFailed?: boolean; responseText?: string };
  if (e.authenticationFailed || /auth|login|credentials|password/i.test(e.responseText ?? e.message)) {
    return "Authentication failed. Check your username and password (many providers need an app password).";
  }
  switch (e.code) {
    case "ENOTFOUND":
      return "Server not found. Check the host name.";
    case "ECONNREFUSED":
      return "Connection refused. Check the host and port.";
    case "ETIMEDOUT":
    case "ETIMEOUT":
    case "CONNECT_TIMEOUT":
      return "Connection timed out.";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "The server uses a self-signed certificate.";
  }
  return e.responseText || e.message || "Connection failed";
}
