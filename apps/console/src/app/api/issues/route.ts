import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getProductIssuesSummary } from "@/lib/scraper-store";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getProductIssuesSummary(session.user.id);
  return NextResponse.json(data);
}
