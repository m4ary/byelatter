import { NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/session";
import { clearUnsubscribe, getAccount, getNewsletterMethods, recordUnsubscribe } from "@/lib/store";
import { unsubscribe } from "@/lib/unsubscribe";
import type { UnsubscribeOutcome } from "@/lib/types";

/**
 * Body: { accountId, address, action?: "unsubscribe" | "mark-done" | "reset" }.
 * Unsubscribe links are read from the saved scan, never taken from the client.
 */
export async function POST(request: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const address = typeof body?.address === "string" ? body.address : "";
  const action = body?.action ?? "unsubscribe";

  const methods = accountId && address ? getNewsletterMethods(accountId, address) : null;
  if (!methods) return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });

  if (action === "reset") {
    clearUnsubscribe(accountId, address);
    return NextResponse.json({ ok: true });
  }

  let outcome: UnsubscribeOutcome;
  if (action === "mark-done") {
    outcome = { status: "done", method: "manual", detail: "Marked as unsubscribed." };
  } else {
    try {
      const account = getAccount(accountId);
      if (!account) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
      outcome = await unsubscribe(account, methods);
    } catch (err) {
      outcome = { status: "failed", detail: (err as Error).message };
    }
  }

  recordUnsubscribe(accountId, address, outcome);
  return NextResponse.json(outcome);
}
