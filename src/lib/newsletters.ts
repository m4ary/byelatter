import { simpleParser, type AddressObject } from "mailparser";
import type { Newsletter, UnsubscribeMethods } from "./types";

/** The headers we need from each message; requested from IMAP to keep scans light. */
export const WANTED_HEADERS = [
  "from",
  "subject",
  "date",
  "list-unsubscribe",
  "list-unsubscribe-post",
  "list-id",
  "precedence",
];

export interface ParsedMessage {
  address: string;
  name: string;
  subject: string;
  date: Date | null;
  listId?: string;
  unsubscribe: UnsubscribeMethods;
}

/** Extract `<...>` entries from a List-Unsubscribe header value (RFC 2369). */
export function parseListUnsubscribe(value: string): { urls: string[]; mailtos: string[] } {
  const urls: string[] = [];
  const mailtos: string[] = [];
  const entries = value.match(/<[^>]+>/g) ?? [];
  for (const raw of entries) {
    const entry = raw.slice(1, -1).replace(/\s+/g, "");
    if (/^https?:\/\//i.test(entry)) urls.push(entry);
    else if (/^mailto:/i.test(entry)) mailtos.push(entry);
  }
  return { urls, mailtos };
}

function headerText(headers: Map<string, unknown>, key: string): string {
  const value = headers.get(key);
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  return String(value);
}

/**
 * Parse a raw header block. Returns null for messages that don't look like
 * newsletters (no List-Unsubscribe header).
 */
export async function parseHeaderBlock(raw: string | Buffer): Promise<ParsedMessage | null> {
  const text = typeof raw === "string" ? raw : raw.toString("utf8");
  const parsed = await simpleParser(text.trimEnd() + "\r\n\r\n", {
    skipHtmlToText: true,
    skipTextToHtml: true,
    skipImageLinks: true,
    skipTextLinks: true,
  });

  // mailparser folds List-* headers into a "list" object; read the raw lines instead.
  const rawHeader = (name: string) =>
    parsed.headerLines
      .filter((l) => l.key === name)
      .map((l) => l.line.slice(l.line.indexOf(":") + 1).trim())
      .join(", ");

  const listUnsubscribe = rawHeader("list-unsubscribe");
  if (!listUnsubscribe) return null;

  const { urls, mailtos } = parseListUnsubscribe(listUnsubscribe);
  if (urls.length === 0 && mailtos.length === 0) return null;

  const from = (parsed.from as AddressObject | undefined)?.value?.[0];
  const address = (from?.address ?? "").toLowerCase();
  if (!address) return null;

  const listIdRaw = rawHeader("list-id");
  const listId = listIdRaw.match(/<([^>]+)>/)?.[1] ?? (listIdRaw || undefined);

  return {
    address,
    name: from?.name || address,
    subject: parsed.subject ?? headerText(parsed.headers, "subject"),
    date: parsed.date ?? null,
    listId,
    unsubscribe: {
      urls,
      mailtos,
      oneClick: /list-unsubscribe=one-click/i.test(rawHeader("list-unsubscribe-post")),
    },
  };
}

/** Group parsed messages by sender; the newest message decides the unsubscribe method. */
export function groupNewsletters(messages: ParsedMessage[]): Newsletter[] {
  const groups = new Map<string, Newsletter & { _ts: number }>();

  for (const msg of messages) {
    const ts = msg.date?.getTime() ?? 0;
    const existing = groups.get(msg.address);
    if (!existing) {
      groups.set(msg.address, {
        id: msg.address,
        name: msg.name,
        address: msg.address,
        listId: msg.listId,
        count: 1,
        latestSubject: msg.subject,
        latestDate: msg.date?.toISOString() ?? null,
        unsubscribe: msg.unsubscribe,
        _ts: ts,
      });
      continue;
    }
    existing.count += 1;
    if (ts >= existing._ts) {
      existing._ts = ts;
      existing.name = msg.name;
      existing.listId = msg.listId ?? existing.listId;
      existing.latestSubject = msg.subject;
      existing.latestDate = msg.date?.toISOString() ?? existing.latestDate;
      existing.unsubscribe = msg.unsubscribe;
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b._ts - a._ts)
    .map((group) => {
      const { _ts, ...rest } = group;
      void _ts;
      return rest;
    });
}
