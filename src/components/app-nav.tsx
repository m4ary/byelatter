"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LockButton from "./lock-button";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/mailboxes", label: "Mailboxes" },
];

export default function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/" aria-label="Byeletter dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image src="/logo.svg" alt="" width={28} height={28} />
          <span className="hidden sm:inline">Byeletter</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 transition ${
                isActive(l.href)
                  ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/mailboxes/new"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 sm:inline-flex dark:text-violet-400 dark:hover:bg-violet-950/40"
          >
            + Add mailbox
          </Link>
          <LockButton />
        </div>
      </div>
    </header>
  );
}
