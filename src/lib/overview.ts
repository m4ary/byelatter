import "server-only";
import { scanProgress } from "./scanner";
import { listAccounts, listNewsletters } from "./store";
import type { Overview } from "./types";

/** Everything the dashboard needs in one read. */
export function getOverview(): Overview {
  const accounts = listAccounts();
  const newsletters = listNewsletters();
  return {
    accounts,
    progress: scanProgress(),
    newsletters,
    stats: {
      mailboxes: accounts.length,
      newsletters: newsletters.length,
      unsubscribed: newsletters.filter((n) => n.unsubscribeState?.status === "done").length,
      emails: newsletters.reduce((sum, n) => sum + n.count, 0),
    },
  };
}
