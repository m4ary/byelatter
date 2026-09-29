"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AccountSummary, NewsletterRow } from "@/lib/types";
import { card, formatDate, secondaryButton, selectClass } from "./ui";

type StatusFilter = "all" | "subscribed" | "unsubscribed";

const rowKey = (n: NewsletterRow) => `${n.accountId}:${n.address}`;
const isDone = (n: NewsletterRow) => n.unsubscribeState?.status === "done";

function methodBadges(n: NewsletterRow) {
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

async function postUnsubscribe(n: NewsletterRow, action: "unsubscribe" | "mark-done" | "reset") {
  const res = await fetch("/api/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: n.accountId, address: n.address, action }),
  });
  return res.status;
}

export default function NewsletterTable({
  rows,
  accounts,
  onChanged,
}: {
  rows: NewsletterRow[];
  accounts: AccountSummary[];
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("subscribed");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (n) =>
        (accountFilter === "all" || n.accountId === accountFilter) &&
        (statusFilter === "all" || (statusFilter === "unsubscribed") === isDone(n)) &&
        (!q ||
          n.name.toLowerCase().includes(q) ||
          n.address.includes(q) ||
          n.latestSubject.toLowerCase().includes(q)),
    );
  }, [rows, accountFilter, statusFilter, query]);

  async function run(n: NewsletterRow, action: "unsubscribe" | "mark-done" | "reset") {
    const key = rowKey(n);
    setWorking((w) => new Set(w).add(key));
    if ((await postUnsubscribe(n, action)) === 401) router.replace("/unlock");
    setWorking((w) => {
      const next = new Set(w);
      next.delete(key);
      return next;
    });
  }

  async function unsubscribeOne(n: NewsletterRow) {
    await run(n, "unsubscribe");
    await onChanged();
  }

  async function unsubscribeSelected() {
    setBulkRunning(true);
    for (const n of visible.filter((r) => selected.has(rowKey(r)) && !isDone(r))) await run(n, "unsubscribe");
    setSelected(new Set());
    setBulkRunning(false);
    await onChanged();
  }

  const selectable = visible.filter((n) => !isDone(n));
  const allSelected = selectable.length > 0 && selectable.every((n) => selected.has(rowKey(n)));
  const showMailbox = accounts.length > 1;

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        {showMailbox && (
          <select
            aria-label="Mailbox"
            className={selectClass}
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">All mailboxes</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Status"
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="subscribed">Still subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="all">All</option>
        </select>
        <input
          type="search"
          placeholder="Search sender or subject"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${selectClass} min-w-48 flex-1 px-3`}
        />
        <button
          onClick={unsubscribeSelected}
          disabled={selected.size === 0 || bulkRunning}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40"
        >
          {bulkRunning ? "Unsubscribing…" : `Unsubscribe selected (${selected.size})`}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-neutral-500">
          {rows.length === 0 ? "No newsletters yet. Run a scan to find them." : "Nothing matches these filters."}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/40">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allSelected}
              onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map(rowKey)) : new Set())}
            />
            <span>
              {visible.length} {visible.length === 1 ? "sender" : "senders"}
            </span>
          </div>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {visible.map((n) => {
              const key = rowKey(n);
              const done = isDone(n);
              const busy = working.has(key) || bulkRunning;
              const state = n.unsubscribeState;
              const extraFolders = n.folders.filter((f) => f !== "INBOX");
              return (
                <li key={key} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${done ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${n.name}`}
                    checked={selected.has(key)}
                    disabled={done}
                    onChange={(e) =>
                      setSelected((s) => {
                        const next = new Set(s);
                        if (e.target.checked) next.add(key);
                        else next.delete(key);
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
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      {showMailbox && (
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                          {n.accountLabel}
                        </span>
                      )}
                      {extraFolders.map((f) => (
                        <span key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {f}
                        </span>
                      ))}
                    </div>
                    {state && state.detail && (
                      <p
                        className={`mt-1 text-xs ${
                          state.status === "done"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : state.status === "manual"
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {state.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    {done ? (
                      <>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Unsubscribed</span>
                        <button
                          onClick={async () => {
                            await run(n, "reset");
                            await onChanged();
                          }}
                          className="text-xs text-neutral-500 hover:underline"
                        >
                          Undo
                        </button>
                      </>
                    ) : state?.status === "manual" && state.url ? (
                      <>
                        <a
                          href={state.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-md border border-amber-400 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/40"
                        >
                          {state.url.startsWith("mailto:") ? "Send email" : "Open link"}
                        </a>
                        <button
                          onClick={async () => {
                            await run(n, "mark-done");
                            await onChanged();
                          }}
                          className={secondaryButton}
                        >
                          Mark done
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => unsubscribeOne(n)}
                        disabled={busy}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {working.has(key) ? "Working…" : state?.status === "failed" ? "Retry" : "Unsubscribe"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
