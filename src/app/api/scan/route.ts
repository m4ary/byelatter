import { NextResponse } from "next/server";
import { MAX_PER_FOLDER } from "@/lib/mail";
import { scanProgress, startScans } from "@/lib/scanner";
import { denyUnlessAdmin } from "@/lib/session";
import { listAccounts } from "@/lib/store";

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  return NextResponse.json({ progress: scanProgress() });
}

/**
 * Start background scans. Body: { accountIds?: string[] (default: every mailbox),
 * scope: "inbox" | "all", limit?: number (newest messages per folder) }.
 */
export async function POST(request: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const known = new Set(listAccounts().map((a) => a.id));
  const requested = Array.isArray(body.accountIds)
    ? body.accountIds.filter((id): id is string => typeof id === "string" && known.has(id))
    : [...known];
  const scope = body.scope === "all" ? "all" : "inbox";
  const limit = Math.min(Math.max(Number(body.limit) || 500, 1), MAX_PER_FOLDER);

  if (requested.length === 0) return NextResponse.json({ error: "No mailboxes to scan" }, { status: 400 });

  const queued = startScans(requested, scope, limit);
  return NextResponse.json({ queued, progress: scanProgress() }, { status: 202 });
}
