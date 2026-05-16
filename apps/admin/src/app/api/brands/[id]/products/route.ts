import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import { adminListProducts, adminUpdateProduct } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const p = req.nextUrl.searchParams;
  const limit  = Math.min(Math.max(Number(p.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(p.get("offset")) || 0, 0);
  const status = p.get("status") ?? "all";
  const q      = p.get("q")?.trim() ?? "";
  const issues = p.get("issues") === "1";

  const result = await adminListProducts(Number(id), { limit, offset, status, q, issues });
  return NextResponse.json({ ...result, hasMore: offset + limit < result.total });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await params; // consume params
  const body = await req.json().catch(() => null);
  const productId = Number(body?.id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Product id required" }, { status: 400 });
  }

  const input: Record<string, string | null> = {};
  for (const key of ["status", "title", "price", "notes"] as const) {
    if (key in body) {
      input[key] = typeof body[key] === "string" ? body[key] : null;
    }
  }

  await adminUpdateProduct(productId, input);
  return NextResponse.json({ updated: true });
}
