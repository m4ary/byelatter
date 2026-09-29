import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { unsubscribe } from "@/lib/unsubscribe";
import type { UnsubscribeMethods } from "@/lib/types";

function stringList(value: unknown, prefix: RegExp): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && prefix.test(v)).slice(0, 5);
}

export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { unsubscribe?: Record<string, unknown> } | null;
  const raw = body?.unsubscribe;
  if (!raw) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const methods: UnsubscribeMethods = {
    urls: stringList(raw.urls, /^https?:\/\//i),
    mailtos: stringList(raw.mailtos, /^mailto:/i),
    oneClick: Boolean(raw.oneClick),
  };

  return NextResponse.json(await unsubscribe(account, methods));
}
