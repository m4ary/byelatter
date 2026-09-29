import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** Sign out of the mailbox but keep the app unlocked. */
export async function POST() {
  const session = await getSession();
  delete session.account;
  await session.save();
  return NextResponse.json({ ok: true });
}
