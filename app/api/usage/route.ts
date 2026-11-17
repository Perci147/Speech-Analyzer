import { NextResponse } from "next/server";
import { getUsage, identifyCaller } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Today's analysis usage for the current guest or signed-in user. */
export async function GET(req: Request) {
  const caller = await identifyCaller(req);
  const usage = await getUsage(caller);
  return NextResponse.json(usage, { headers: { "Cache-Control": "no-store" } });
}
