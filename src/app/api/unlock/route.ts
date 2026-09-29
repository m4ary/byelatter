import { NextResponse } from "next/server";
import { adminPassword } from "@/lib/auth-config";
import { checkAdminPassword, getSession } from "@/lib/session";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const failures = new Map<string, { count: number; since: number }>();

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (!adminPassword()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set on the server. Set it and restart the app." },
      { status: 503 },
    );
  }

  const key = clientKey(request);
  const now = Date.now();
  const entry = failures.get(key);
  if (entry && now - entry.since < WINDOW_MS && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkAdminPassword(password)) {
    const fresh = !entry || now - entry.since >= WINDOW_MS;
    failures.set(key, { count: fresh ? 1 : entry.count + 1, since: fresh ? now : entry.since });
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  failures.delete(key);
  const session = await getSession();
  session.admin = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
