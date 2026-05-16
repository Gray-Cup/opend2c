import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import { adminTransferBrand } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const toEmail = typeof body?.email === "string" ? body.email.trim() : "";
  if (!toEmail) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const result = await adminTransferBrand(Number(id), toEmail);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ transferred: true });
}
