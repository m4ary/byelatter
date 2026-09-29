"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OUTLOOK_PROXY_ID, type Provider } from "@/lib/providers";
import type { Protocol, ServerConfig } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

function ServerFields({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: ServerConfig;
  onChange: (v: ServerConfig) => void;
  optional?: boolean;
}) {
  return (
    <fieldset className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <legend className="px-1 text-xs font-medium">
        {label} {optional && <span className="text-neutral-500">(optional)</span>}
      </legend>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <input
          className={inputClass}
          placeholder="mail.example.com"
          value={value.host}
          onChange={(e) => onChange({ ...value, host: e.target.value })}
          required={!optional}
        />
        <input
          className={inputClass}
          type="number"
          min={1}
          max={65535}
          value={value.port}
          onChange={(e) => onChange({ ...value, port: Number(e.target.value) })}
          required={!optional}
        />
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value.secure}
          onChange={(e) => onChange({ ...value, secure: e.target.checked })}
        />
        Use SSL/TLS (uncheck for STARTTLS or plain)
      </label>
    </fieldset>
  );
}

const DEFAULT_PORTS: Record<Protocol, ServerConfig> = {
  imap: { host: "", port: 993, secure: true },
  pop3: { host: "", port: 995, secure: true },
};

export default function MailboxForm({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [providerId, setProviderId] = useState("gmail");
  const [providerTouched, setProviderTouched] = useState(false);
  const [protocol, setProtocol] = useState<Protocol>("imap");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [incoming, setIncoming] = useState<ServerConfig>(DEFAULT_PORTS.imap);
  const [smtp, setSmtp] = useState<ServerConfig>({ host: "", port: 465, secure: true });
  const [allowSelfSigned, setAllowSelfSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const provider = providers.find((p) => p.id === providerId) ?? providers[providers.length - 1];
  const isCustom = provider.id === "custom";
  const isOutlookProxy = provider.id === OUTLOOK_PROXY_ID;
  const supports = (p: Protocol) => isCustom || Boolean(provider[p]);

  function selectProvider(id: string) {
    setProviderId(id);
    const next = providers.find((p) => p.id === id);
    if (next && next.id !== "custom" && !next[protocol]) setProtocol(next.imap ? "imap" : "pop3");
  }

  function onEmailChange(value: string) {
    setEmail(value);
    if (providerTouched) return;
    const domain = value.split("@")[1]?.toLowerCase();
    if (!domain) return;
    const match = providers.find((p) => p.domains.includes(domain));
    selectProvider(match?.id ?? "custom");
  }

  function onProtocolChange(p: Protocol) {
    setProtocol(p);
    if (isCustom && incoming.port === DEFAULT_PORTS[protocol].port) {
      setIncoming({ ...incoming, port: DEFAULT_PORTS[p].port });
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || undefined,
          providerId,
          protocol,
          email,
          username: username || undefined,
          password,
          ...(isCustom && {
            incoming,
            smtp: smtp.host ? smtp : undefined,
            allowSelfSigned,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add mailbox");
      router.push("/mailboxes");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const presetServer = !isCustom ? provider[protocol] : undefined;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className={inputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="label">
            Name <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            id="label"
            className={inputClass}
            placeholder="Personal, Work…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="provider">
            Provider
          </label>
          <select
            id="provider"
            className={inputClass}
            value={providerId}
            onChange={(e) => {
              setProviderTouched(true);
              selectProvider(e.target.value);
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={labelClass}>Protocol</span>
          <div className="flex overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
            {(["imap", "pop3"] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={!supports(p)}
                onClick={() => onProtocolChange(p)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  protocol === p
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                {p === "imap" ? "IMAP" : "POP3"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {provider.note && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {provider.note}{" "}
          {provider.helpUrl && (
            <a className="underline" href={provider.helpUrl} target="_blank" rel="noreferrer">
              Learn more
            </a>
          )}
        </p>
      )}

      {presetServer && !isOutlookProxy && (
        <p className="text-xs text-neutral-500">
          Connecting to <code>{presetServer.host}:{presetServer.port}</code>
          {presetServer.secure ? " over SSL/TLS" : " with STARTTLS"}
          {provider.smtp ? `, unsubscribe emails via ${provider.smtp.host}` : ""}.
        </p>
      )}

      {isCustom && (
        <div className="space-y-3">
          <ServerFields
            label={protocol === "imap" ? "IMAP server" : "POP3 server"}
            value={incoming}
            onChange={setIncoming}
          />
          <ServerFields label="SMTP server — for mailto unsubscribes" value={smtp} onChange={setSmtp} optional />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allowSelfSigned}
              onChange={(e) => setAllowSelfSigned(e.target.checked)}
            />
            Allow self-signed certificates
          </label>
        </div>
      )}

      {!isOutlookProxy && (
        <div>
          <label className={labelClass} htmlFor="username">
            Username <span className="text-neutral-400">(defaults to your email)</span>
          </label>
          <input
            id="username"
            className={inputClass}
            autoComplete="username"
            value={username}
            placeholder={email}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="password">
          {isOutlookProxy ? "Choose a password for the proxy" : "Password / app password"}
        </label>
        <input
          id="password"
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {loading && isOutlookProxy && (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          Waiting for Microsoft sign-in. Run <code>docker compose logs -f outlook-proxy</code>, open the
          microsoft.com link it shows and enter the code. This page continues once you&apos;ve signed in (up to 10
          minutes).
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {loading ? "Checking login…" : "Add mailbox"}
      </button>
    </form>
  );
}
