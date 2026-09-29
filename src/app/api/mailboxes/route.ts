import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";
import { describeError, listMailboxes } from "@/lib/mail";

export async function GET() {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    return NextResponse.json({ mailboxes: await listMailboxes(account) });
  } catch (err) {
    return NextResponse.json({ error: describeError(err) }, { status: 502 });
  }
}
