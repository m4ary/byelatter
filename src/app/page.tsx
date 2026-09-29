import { redirect } from "next/navigation";
import { PROVIDERS } from "@/lib/providers";
import { requireAccount } from "@/lib/session";
import LockButton from "@/components/lock-button";
import LoginForm from "@/components/login-form";

export default async function Home() {
  if (await requireAccount()) redirect("/newsletters");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Byeletter</h1>
        <LockButton />
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to your mailbox over IMAP or POP3, see every newsletter you receive, and unsubscribe in one
        click. Your credentials stay in an encrypted, http-only session cookie and are never stored on disk.
      </p>
      <div className="mt-8">
        <LoginForm providers={PROVIDERS} />
      </div>
    </main>
  );
}
