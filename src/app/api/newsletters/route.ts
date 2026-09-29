import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/session";
import { describeError, MAX_SCAN, scanNewsletters } from "@/lib/mail";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const limit = Math.min(Number(params.get("limit")) || 300, MAX_SCAN);
  const mailbox = params.get("mailbox") || "INBOX";

  try {
    return NextResponse.json(await scanNewsletters(account, { limit, mailbox }));
  } catch (err) {
    return NextResponse.json({ error: describeError(err) }, { status: 502 });
  }
}
