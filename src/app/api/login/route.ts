import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { getSession } from "@/lib/session";
import { verifyAccount } from "@/lib/mail";
import type { MailAccount, Protocol, ServerConfig } from "@/lib/types";

function parseServer(value: unknown): ServerConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const host = typeof v.host === "string" ? v.host.trim() : "";
  const port = Number(v.port);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  return { host, port, secure: Boolean(v.secure) };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username = (typeof body.username === "string" && body.username.trim()) || email;
  const protocol: Protocol = body.protocol === "pop3" ? "pop3" : "imap";
  const provider = getProvider(typeof body.providerId === "string" ? body.providerId : "custom");

  if (!email || !password || !provider) {
    return NextResponse.json({ error: "Email, password and provider are required." }, { status: 400 });
  }

  const isCustom = provider.id === "custom";
  const incoming = isCustom ? parseServer(body.incoming) : provider[protocol];
  const smtp = isCustom ? parseServer(body.smtp) : provider.smtp;

  if (!incoming) {
    return NextResponse.json(
      {
        error: isCustom
          ? "Enter a valid incoming server host and port."
          : `${provider.name} does not support ${protocol.toUpperCase()}.`,
      },
      { status: 400 },
    );
  }

  const account: MailAccount = {
    providerId: provider.id,
    protocol,
    email,
    username,
    password,
    incoming,
    smtp,
    allowSelfSigned: isCustom ? Boolean(body.allowSelfSigned) : provider.allowSelfSigned,
  };

  try {
    await verifyAccount(account);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const session = await getSession();
  session.account = account;
  await session.save();
  return NextResponse.json({ ok: true });
}
