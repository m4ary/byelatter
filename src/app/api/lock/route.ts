import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** Lock the app: forgets the admin unlock and any signed-in mailbox. */
export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
