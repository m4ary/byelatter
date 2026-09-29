import { NextResponse } from "next/server";
import { getOverview } from "@/lib/overview";
import { denyUnlessAdmin } from "@/lib/session";

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  return NextResponse.json(getOverview());
}
