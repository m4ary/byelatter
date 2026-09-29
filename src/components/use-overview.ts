"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Overview, ScanScope } from "@/lib/types";

const POLL_MS = 1500;

/** Dashboard state from /api/overview; polls while any scan is queued or running. */
export function useOverview(initial: Overview) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/unlock");
        return;
      }
      if (res.ok) setData(await res.json());
    } catch {
      // transient network error; next poll retries
    }
  }, [router]);

  const active = Object.values(data.progress).some((p) => p.state === "queued" || p.state === "scanning");

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);

  const scan = useCallback(
    async (accountIds: string[] | undefined, scope: ScanScope, limit: number) => {
      setError(null);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds, scope, limit }),
      });
      if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "Could not start scan");
      await refresh();
    },
    [refresh],
  );

  return { data, refresh, scan, active, error };
}
