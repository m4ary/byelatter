import { connection } from "next/server";
import Dashboard from "@/components/dashboard";
import { getOverview } from "@/lib/overview";

export default async function DashboardPage() {
  await connection(); // reads the database; never prerender
  return <Dashboard initial={getOverview()} />;
}
