import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/session";

export async function GET() {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({
    email: account.email,
    protocol: account.protocol,
    providerId: account.providerId,
    hasSmtp: Boolean(account.smtp),
  });
}
