"use client";

import { useState } from "react";
import type { ScanScope } from "@/lib/types";
import { primaryButton, secondaryButton, selectClass } from "./ui";

const DEPTHS = [100, 500, 1000, 2000, 5000];

/** Scope + depth pickers with a scan button. */
export default function ScanControls({
  label,
  busy,
  allowAllFolders = true,
  variant = "primary",
  onScan,
}: {
  label: string;
  busy?: boolean;
  allowAllFolders?: boolean;
  variant?: "primary" | "secondary";
  onScan: (scope: ScanScope, limit: number) => void | Promise<void>;
}) {
  const [scope, setScope] = useState<ScanScope>("inbox");
  const [limit, setLimit] = useState(500);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Folders to scan"
        className={selectClass}
        value={allowAllFolders ? scope : "inbox"}
        onChange={(e) => setScope(e.target.value as ScanScope)}
      >
        <option value="inbox">Inbox</option>
        <option value="all" disabled={!allowAllFolders}>
          All folders{allowAllFolders ? "" : " (IMAP only)"}
        </option>
      </select>
      <select
        aria-label="Messages per folder"
        className={selectClass}
        value={limit}
        onChange={(e) => setLimit(Number(e.target.value))}
      >
        {DEPTHS.map((d) => (
          <option key={d} value={d}>
            Newest {d.toLocaleString()}
          </option>
        ))}
      </select>
      <button
        className={variant === "primary" ? primaryButton : secondaryButton}
        disabled={busy}
        onClick={() => onScan(allowAllFolders ? scope : "inbox", limit)}
      >
        {busy ? "Scanning…" : label}
      </button>
    </div>
  );
}
