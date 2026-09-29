"use client";

import Link from "next/link";
import { useState } from "react";
import { getProvider } from "@/lib/providers";
import type { AccountSummary, Overview } from "@/lib/types";
import ScanControls from "./scan-controls";
import ScanStatus from "./scan-status";
import { Alert, card, PageHeader, primaryButton, timeAgo } from "./ui";
import { useOverview } from "./use-overview";

function MailboxCard({
  account,
  busy,
  progress,
  onScan,
  onChanged,
}: {
  account: AccountSummary;
  busy: boolean;
  progress: Overview["progress"][string] | undefined;
  onScan: Parameters<typeof ScanControls>[0]["onScan"];
  onChanged: () => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(account.label);
  const provider = getProvider(account.providerId)?.name ?? "Custom server";

  async function saveLabel() {
    setRenaming(false);
    if (!label.trim() || label === account.label) return setLabel(account.label);
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    await onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${account.email}? Its saved credentials and scan results will be deleted.`)) return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    await onChanged();
  }

  return (
    <article className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={(e) => e.key === "Enter" && saveLabel()}
              className="w-full rounded border border-neutral-300 bg-transparent px-2 py-0.5 font-semibold dark:border-neutral-700"
            />
          ) : (
            <button onClick={() => setRenaming(true)} className="truncate text-left font-semibold hover:underline" title="Rename">
              {account.label}
            </button>
          )}
          <p className="truncate text-sm text-neutral-500">{account.email}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {provider} · {account.protocol.toUpperCase()}
            {account.hasSmtp ? " · SMTP" : ""}
          </p>
        </div>
        <button onClick={remove} className="text-xs text-neutral-400 hover:text-red-600" aria-label={`Remove ${account.email}`}>
          Remove
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-950/50">
          <dt className="text-xs text-neutral-500">Newsletters</dt>
          <dd className="text-lg font-semibold tabular-nums">{account.newsletterCount}</dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-950/50">
          <dt className="text-xs text-neutral-500">Unsubscribed</dt>
          <dd className="text-lg font-semibold tabular-nums">{account.unsubscribedCount}</dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-950/50">
          <dt className="text-xs text-neutral-500">Last scan</dt>
          <dd className="truncate pt-1 text-sm font-medium">{timeAgo(account.lastScanAt)}</dd>
        </div>
      </dl>

      {account.lastScanAt && (
        <p className="-mt-2 text-xs text-neutral-500">
          Read {account.lastScanScanned?.toLocaleString() ?? 0} messages from{" "}
          {account.lastScanScope === "all" ? "all folders" : "the inbox"}.
        </p>
      )}

      {busy ? (
        <ScanStatus progress={progress} />
      ) : (
        account.lastError && <p className="text-xs text-red-600 dark:text-red-400">Last scan failed: {account.lastError}</p>
      )}

      <div className="mt-auto">
        <ScanControls
          label="Scan"
          variant="secondary"
          busy={busy}
          allowAllFolders={account.protocol === "imap"}
          onScan={onScan}
        />
      </div>
    </article>
  );
}

export default function Mailboxes({ initial }: { initial: Overview }) {
  const { data, refresh, scan, active, error } = useOverview(initial);
  const { accounts, progress } = data;
  const isBusy = (id: string) => progress[id]?.state === "queued" || progress[id]?.state === "scanning";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mailboxes"
        subtitle="Scan one mailbox, or all of them together. IMAP mailboxes can scan every folder."
        actions={
          <>
            {accounts.length > 1 && (
              <ScanControls
                label="Scan all"
                variant="secondary"
                busy={active}
                allowAllFolders={accounts.some((a) => a.protocol === "imap")}
                onScan={(scope, limit) => scan(undefined, scope, limit)}
              />
            )}
            <Link href="/mailboxes/new" className={primaryButton}>
              Add mailbox
            </Link>
          </>
        }
      />

      {error && <Alert>{error}</Alert>}

      {accounts.length === 0 ? (
        <div className={`${card} p-10 text-center text-sm text-neutral-500`}>
          No mailboxes yet.{" "}
          <Link href="/mailboxes/new" className="text-violet-600 hover:underline">
            Add one
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <MailboxCard
              key={a.id}
              account={a}
              busy={isBusy(a.id)}
              progress={progress[a.id]}
              onScan={(scope, limit) => scan([a.id], scope, limit)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <p className="text-xs text-neutral-500">
          Newsletters appear on the{" "}
          <Link href="/" className="text-violet-600 hover:underline dark:text-violet-400">
            dashboard
          </Link>{" "}
          as soon as a scan finishes.
        </p>
      )}
    </div>
  );
}
