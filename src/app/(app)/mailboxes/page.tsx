import { connection } from "next/server";
import Mailboxes from "@/components/mailboxes";
import { getOverview } from "@/lib/overview";

export default async function MailboxesPage() {
  await connection(); // reads the database; never prerender
  return <Mailboxes initial={getOverview()} />;
}
