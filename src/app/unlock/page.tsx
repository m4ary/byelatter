import { redirect } from "next/navigation";
import { adminPassword } from "@/lib/auth-config";
import { isAdmin } from "@/lib/session";
import UnlockForm from "@/components/unlock-form";

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const next = safeNext((await searchParams).next);
  if (await isAdmin()) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Byelatter</h1>
      <p className="mt-2 text-sm text-neutral-500">This app is private. Enter the admin password to continue.</p>
      <div className="mt-8">
        <UnlockForm next={next} configured={Boolean(adminPassword())} />
      </div>
    </main>
  );
}
