"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Newsletter, Protocol, ScanResult, UnsubscribeOutcome } from "@/lib/types";
import LockButton from "./lock-button";

type RowState = { status: "working" } | UnsubscribeOutcome;

const STORAGE_KEY = "byeletter:unsubscribed";
const SCAN_SIZES = [100, 300, 500, 1000, 2000];

function loadDone(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveDone(value: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage unavailable — fine, it's only a convenience
  }
}

function methodBadges(n: Newsletter) {
  const badges: { label: string; className: string }[] = [];
  if (n.unsubscribe.oneClick && n.unsubscribe.urls.some((u) => u.startsWith("https://"))) {
    badges.push({ label: "One-click", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" });
  }
  if (n.unsubscribe.mailtos.length) {
    badges.push({ label: "Email", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" });
  }
  if (n.unsubscribe.urls.length) {
    badges.push({ label: "Link", className: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" });
  }
  return badges;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function NewsletterList({
  email,
  protocol,
  providerName,
  hasSmtp,
}: {
  email: string;
  protocol: Protocol;
  providerName: string;
  hasSmtp: boolean;
}) {
  const router = useRouter();
  const [mailboxes, setMailboxes] = useState<string[]>(["INBOX"]);
  const [mailbox, setMailbox] = useState("INBOX");
  const [limit, setLimit] = useState(300);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [done, setDone] = useState<Record<string, string>>({});
  const [bulkRunning, setBulkRunning] = useState(false);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit), mailbox });
      const res = await fetch(`/api/newsletters?${params}`);
      if (res.status === 401) return router.replace("/");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
      setSelected(new Set());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  }, [limit, mailbox, router]);

  useEffect(() => {
    // Deferred so the first render matches the server (localStorage is client-only).
    const timer = setTimeout(() => {
      setDone(loadDone());
      scan();
    }, 0);
    if (protocol === "imap") {
      fetch("/api/mailboxes")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.mailboxes?.length && setMailboxes(d.mailboxes))
        .catch(() => {});
    }
    return () => clearTimeout(timer);
    // Initial scan only; later scans are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (result?.newsletters ?? []).filter(
      (n) =>
        (!hideDone || !done[n.id]) &&
        (!q || n.name.toLowerCase().includes(q) || n.address.includes(q) || n.latestSubject.toLowerCase().includes(q)),
    );
  }, [result, query, hideDone, done]);

  async function unsubscribeOne(n: Newsletter) {
    setRows((r) => ({ ...r, [n.id]: { status: "working" } }));
    let outcome: UnsubscribeOutcome;
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unsubscribe: n.unsubscribe }),
      });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      outcome = await res.json();
    } catch (err) {
      outcome = { status: "failed", detail: (err as Error).message };
    }
    setRows((r) => ({ ...r, [n.id]: outcome }));
    if (outcome.status === "done") {
      setDone((d) => {
        const next = { ...d, [n.id]: new Date().toISOString() };
        saveDone(next);
        return next;
      });
    }
  }

  async function unsubscribeSelected() {
    setBulkRunning(true);
    const targets = visible.filter((n) => selected.has(n.id));
    for (const n of targets) await unsubscribeOne(n);
    setSelected(new Set());
    setBulkRunning(false);
  }

  function markDone(n: Newsletter) {
    setDone((d) => {
      const next = { ...d, [n.id]: new Date().toISOString() };
      saveDone(next);
      return next;
    });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const allVisibleSelected = visible.length > 0 && visible.every((n) => selected.has(n.id));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Byeletter</h1>
          <p className="text-sm text-neutral-500">
            {email} · {providerName} · {protocol.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Sign out
          </button>
          <LockButton />
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        {protocol === "imap" && (
          <label className="text-xs">
            <span className="mb-1 block font-medium text-neutral-600 dark:text-neutral-400">Folder</span>
            <select
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
            >
              {mailboxes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs">
          <span className="mb-1 block font-medium text-neutral-600 dark:text-neutral-400">Scan newest</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            {SCAN_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} emails
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={scan}
          disabled={scanning}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {scanning ? "Scanning…" : "Scan"}
        </button>
        <input
          type="search"
          placeholder="Filter by sender or subject"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto min-w-48 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700 sm:flex-none"
        />
      </section>

      {!hasSmtp && (
        <p className="mt-3 text-xs text-neutral-500">
          No SMTP server configured, so email-only unsubscribes will open in your mail app instead of being sent
          automatically.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-neutral-500">
            Found <strong className="text-foreground">{result.newsletters.length}</strong> newsletters in the newest{" "}
            {result.scanned} of {result.total} messages in {result.mailbox}.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
              Hide unsubscribed
            </label>
            <button
              onClick={unsubscribeSelected}
              disabled={selected.size === 0 || bulkRunning}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40"
            >
              {bulkRunning ? "Unsubscribing…" : `Unsubscribe selected (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      {scanning && !result && <p className="mt-10 text-center text-sm text-neutral-500">Reading your mailbox…</p>}

      {result && visible.length === 0 && !scanning && (
        <p className="mt-10 text-center text-sm text-neutral-500">No newsletters found. Try scanning more emails.</p>
      )}

      {visible.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allVisibleSelected}
              onChange={(e) =>
                setSelected(e.target.checked ? new Set(visible.filter((n) => !done[n.id]).map((n) => n.id)) : new Set())
              }
            />
            <span>Sender</span>
          </div>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {visible.map((n) => {
              const row = rows[n.id];
              const isDone = Boolean(done[n.id]);
              return (
                <li key={n.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${isDone ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${n.name}`}
                    checked={selected.has(n.id)}
                    disabled={isDone}
                    onChange={(e) =>
                      setSelected((s) => {
                        const next = new Set(s);
                        if (e.target.checked) next.add(n.id);
                        else next.delete(n.id);
                        return next;
                      })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{n.name}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {n.count} {n.count === 1 ? "email" : "emails"}
                      </span>
                      {methodBadges(n).map((b) => (
                        <span key={b.label} className={`rounded-full px-2 py-0.5 text-xs ${b.className}`}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {n.address}
                      {n.latestDate && ` · ${formatDate(n.latestDate)}`}
                      {n.latestSubject && ` · ${n.latestSubject}`}
                    </p>
                    {row && row.status !== "working" && (
                      <p
                        className={`mt-1 text-xs ${
                          row.status === "done"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : row.status === "manual"
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {row.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {row?.status === "manual" && !isDone && (
                      <>
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-md border border-amber-400 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/40"
                        >
                          {row.url.startsWith("mailto:") ? "Send email" : "Open link"}
                        </a>
                        <button
                          onClick={() => markDone(n)}
                          className="rounded-md px-2 py-1.5 text-xs text-neutral-500 hover:underline"
                        >
                          Mark done
                        </button>
                      </>
                    )}
                    {isDone ? (
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Unsubscribed</span>
                    ) : (
                      row?.status !== "manual" && (
                        <button
                          onClick={() => unsubscribeOne(n)}
                          disabled={row?.status === "working" || bulkRunning}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          {row?.status === "working" ? "Working…" : "Unsubscribe"}
                        </button>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
