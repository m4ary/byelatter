"use client";

import Link from "next/link";
import type { Overview } from "@/lib/types";
import NewsletterTable from "./newsletter-table";
import ScanControls from "./scan-controls";
import ScanStatus from "./scan-status";
import { Alert, card, PageHeader, primaryButton, StatCard, timeAgo } from "./ui";
import { useOverview } from "./use-overview";

export default function Dashboard({ initial }: { initial: Overview }) {
  const { data, refresh, scan, active, error } = useOverview(initial);
  const { accounts, progress, stats } = data;

  if (accounts.length === 0) {
    return (
      <div className={`${card} mx-auto mt-10 max-w-lg p-10 text-center`}>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Byeletter</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Add your first mailbox to find every newsletter you receive. You can add as many IMAP or POP3 accounts as
          you like and scan them all at once.
        </p>
        <Link href="/mailboxes/new" className={`${primaryButton} mt-6`}>
          Add a mailbox
        </Link>
      </div>
    );
  }

  const lastScan = accounts
    .map((a) => a.lastScanAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  const hasImap = accounts.some((a) => a.protocol === "imap");
  const scanning = accounts.filter((a) => progress[a.id] && progress[a.id].state !== "done");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Last scan ${timeAgo(lastScan ?? null)} across ${accounts.length} ${accounts.length === 1 ? "mailbox" : "mailboxes"}`}
        actions={
          <ScanControls
            label={accounts.length > 1 ? "Scan all mailboxes" : "Scan"}
            busy={active}
            allowAllFolders={hasImap}
            onScan={(scope, limit) => scan(undefined, scope, limit)}
          />
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Mailboxes" value={stats.mailboxes} />
        <StatCard label="Newsletters" value={stats.newsletters} hint="Distinct senders" />
        <StatCard label="Newsletter emails" value={stats.emails.toLocaleString()} hint="In scanned messages" />
        <StatCard
          label="Unsubscribed"
          value={stats.unsubscribed}
          hint={stats.newsletters ? `${Math.round((stats.unsubscribed / stats.newsletters) * 100)}% of senders` : undefined}
        />
      </div>

      {scanning.length > 0 && (
        <section className={`${card} divide-y divide-neutral-200 dark:divide-neutral-800`}>
          {scanning.map((a) => (
            <div key={a.id} className="space-y-1 px-4 py-3">
              <p className="text-sm font-medium">{a.label}</p>
              <ScanStatus progress={progress[a.id]} />
            </div>
          ))}
        </section>
      )}

      <NewsletterTable rows={data.newsletters} accounts={accounts} onChanged={refresh} />
    </div>
  );
}
