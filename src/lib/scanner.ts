import "server-only";
import { describeError, scanAccount } from "./mail";
import { getAccount, saveScanError, saveScanResult } from "./store";
import type { ScanProgress, ScanScope } from "./types";

/** Scans run in the background; several mailboxes at once, one connection each. */
const CONCURRENCY = 3;

interface Job {
  accountId: string;
  scope: ScanScope;
  limit: number;
}

interface ScannerState {
  progress: Map<string, ScanProgress>;
  queue: Job[];
  running: number;
}

// Kept on globalThis so every route bundle in this process sees the same scanner.
const g = globalThis as unknown as { byeletterScanner?: ScannerState };
const state: ScannerState = (g.byeletterScanner ??= { progress: new Map(), queue: [], running: 0 });

export function scanProgress(): Record<string, ScanProgress> {
  return Object.fromEntries(state.progress);
}

export function isBusy(accountId: string): boolean {
  const p = state.progress.get(accountId);
  return p?.state === "queued" || p?.state === "scanning";
}

/** Queue scans; mailboxes already queued or scanning are skipped. Returns the ids that were queued. */
export function startScans(accountIds: string[], scope: ScanScope, limit: number): string[] {
  const queued: string[] = [];
  for (const accountId of accountIds) {
    if (isBusy(accountId)) continue;
    state.progress.set(accountId, { state: "queued", scope, scanned: 0 });
    state.queue.push({ accountId, scope, limit });
    queued.push(accountId);
  }
  pump();
  return queued;
}

export function forgetProgress(accountId: string) {
  state.queue = state.queue.filter((j) => j.accountId !== accountId);
  state.progress.delete(accountId);
}

function pump() {
  while (state.running < CONCURRENCY && state.queue.length > 0) {
    const job = state.queue.shift()!;
    state.running++;
    run(job).finally(() => {
      state.running--;
      pump();
    });
  }
}

async function run({ accountId, scope: requestedScope, limit }: Job) {
  const progress: ScanProgress = { state: "scanning", scope: requestedScope, scanned: 0 };
  state.progress.set(accountId, progress);
  try {
    const account = getAccount(accountId);
    if (!account) {
      state.progress.delete(accountId);
      return;
    }
    // POP3 only has an inbox, whatever was asked for.
    const scope: ScanScope = account.protocol === "pop3" ? "inbox" : requestedScope;
    progress.scope = scope;
    const result = await scanAccount(account, {
      scope,
      limit,
      onProgress: (u) => Object.assign(progress, u),
    });
    // The mailbox may have been removed while scanning.
    if (!state.progress.has(accountId)) return;
    saveScanResult(accountId, scope, result.scanned, result.newsletters);
    state.progress.set(accountId, { ...progress, state: "done", scanned: result.scanned, folder: undefined });
  } catch (err) {
    const message = err instanceof Error && err.message.startsWith("Saved credentials") ? err.message : describeError(err);
    if (!state.progress.has(accountId)) return;
    try {
      saveScanError(accountId, message);
    } catch {
      // account was deleted
    }
    state.progress.set(accountId, { ...progress, state: "error", error: message });
  }
}
