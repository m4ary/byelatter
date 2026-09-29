"use client";

import { useRouter } from "next/navigation";

export default function LockButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function lock() {
    await fetch("/api/lock", { method: "POST" });
    router.replace("/unlock");
    router.refresh();
  }

  return (
    <button
      onClick={lock}
      className={`rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900 ${className}`}
    >
      Lock app
    </button>
  );
}
