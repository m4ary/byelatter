import { NextResponse, type NextRequest } from "next/server";
import { forgetProgress } from "@/lib/scanner";
import { denyUnlessAdmin } from "@/lib/session";
import { deleteAccount, renameAccount } from "@/lib/store";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/accounts/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { label?: unknown } | null;
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) : "";
  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  renameAccount(id, label);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/accounts/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  forgetProgress(id);
  deleteAccount(id);
  return NextResponse.json({ ok: true });
}
