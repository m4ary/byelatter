import { getProvider, OUTLOOK_PROXY_ID } from "./providers";
import type { MailAccount, Protocol, ServerConfig } from "./types";

function parseServer(value: unknown): ServerConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const host = typeof v.host === "string" ? v.host.trim() : "";
  const port = Number(v.port);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  return { host, port, secure: Boolean(v.secure) };
}

/** Turn the "add mailbox" form body into a MailAccount, or an error message. */
export function parseAccountInput(
  body: Record<string, unknown>,
): { account: MailAccount; label?: string } | { error: string } {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username = (typeof body.username === "string" && body.username.trim()) || email;
  const protocol: Protocol = body.protocol === "pop3" ? "pop3" : "imap";
  const provider = getProvider(typeof body.providerId === "string" ? body.providerId : "custom");
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : undefined;

  if (!email || !password || !provider) return { error: "Email, password and provider are required." };

  const isCustom = provider.id === "custom";
  let incoming = isCustom ? parseServer(body.incoming) : provider[protocol];
  let smtp = isCustom ? parseServer(body.smtp) : provider.smtp;

  const isOutlookProxy = provider.id === OUTLOOK_PROXY_ID;
  if (isOutlookProxy) {
    // The proxy runs next to Byeletter; its host differs between Docker and local development.
    const host = process.env.OUTLOOK_PROXY_HOST || "outlook-proxy";
    incoming = incoming && { ...incoming, host };
    smtp = smtp && { ...smtp, host };
  }

  if (!incoming) {
    return {
      error: isCustom
        ? "Enter a valid incoming server host and port."
        : `${provider.name} does not support ${protocol.toUpperCase()}.`,
    };
  }

  return {
    label: label || undefined,
    account: {
      providerId: provider.id,
      protocol,
      email,
      // The proxy identifies Microsoft accounts by email address.
      username: isOutlookProxy ? email : username,
      password,
      incoming,
      smtp,
      allowSelfSigned: isCustom ? Boolean(body.allowSelfSigned) : provider.allowSelfSigned,
    },
  };
}
