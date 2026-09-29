import { NextResponse } from "next/server";
import { parseAccountInput } from "@/lib/account-input";
import { verifyAccount } from "@/lib/mail";
import { startScans } from "@/lib/scanner";
import { denyUnlessAdmin } from "@/lib/session";
import { accountExists, createAccount, listAccounts } from "@/lib/store";

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  return NextResponse.json({ accounts: listAccounts() });
}

/** Add a mailbox: verify the login, save it encrypted, and start an inbox scan. */
export async function POST(request: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const parsed = parseAccountInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (accountExists(parsed.account.email, parsed.account.protocol)) {
    return NextResponse.json({ error: "This mailbox is already added." }, { status: 409 });
  }

  try {
    await verifyAccount(parsed.account);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const id = createAccount(parsed.account, parsed.label);
  startScans([id], "inbox", 500);
  return NextResponse.json({ id }, { status: 201 });
}
