import type { ScanProgress } from "@/lib/types";

/** One-line live status for a mailbox scan. */
export default function ScanStatus({ progress }: { progress?: ScanProgress }) {
  if (!progress || progress.state === "done") return null;

  if (progress.state === "error") {
    return <p className="text-xs text-red-600 dark:text-red-400">Scan failed: {progress.error}</p>;
  }

  const where =
    progress.state === "queued"
      ? "Waiting to start…"
      : progress.folder
        ? `${progress.folder}${progress.folderCount && progress.folderCount > 1 ? ` (${progress.folderIndex}/${progress.folderCount})` : ""}`
        : "Connecting…";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="truncate">
          {progress.scope === "all" ? "All folders" : "Inbox"} · {where}
        </span>
        <span className="tabular-nums">{progress.scanned.toLocaleString()} read</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full bg-violet-500 ${progress.state === "queued" ? "w-1/12 opacity-40" : "w-1/3 animate-[scan_1.2s_ease-in-out_infinite]"}`}
        />
      </div>
    </div>
  );
}
