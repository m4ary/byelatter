import { redirect } from "next/navigation";
import { getProvider } from "@/lib/providers";
import { requireAccount } from "@/lib/session";
import NewsletterList from "@/components/newsletter-list";

export default async function NewslettersPage() {
  const account = await requireAccount();
  if (!account) redirect("/");

  return (
    <NewsletterList
      email={account.email}
      protocol={account.protocol}
      providerName={getProvider(account.providerId)?.name ?? "Custom"}
      hasSmtp={Boolean(account.smtp)}
    />
  );
}
