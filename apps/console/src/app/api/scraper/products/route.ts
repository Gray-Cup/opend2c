import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { bulkUpdateProducts, deleteProducts, listProducts, updateProduct } from "@/lib/scraper-store";

const STATUSES = new Set(["draft", "active", "archived"]);

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p      = req.nextUrl.searchParams;
  const limit  = Math.min(Math.max(Number(p.get("limit"))  || 10, 1), 100);
  const offset = Math.max(Number(p.get("offset")) || 0, 0);
  const status = p.get("status") ?? "all";
  const q      = p.get("q")?.trim() ?? "";

  const result = await listProducts(session.user.id, { limit, offset, status, q });
  return NextResponse.json({ ...result, hasMore: offset + limit < result.total });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const input: Record<string, string> = {};

  for (const key of ["title", "price", "currency", "notes"] as const) {
    if (key in body) {
      const value = body[key];
      input[key] = typeof value === "string" ? value.trim() : "";
    }
  }

  if ("status" in body) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    input.status = body.status;
  }

  const product = await updateProduct(session.user.id, id, input);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json(product);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
  const status = typeof body?.status === "string" ? body.status : "";

  if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 });
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await bulkUpdateProducts(session.user.id, ids, status);
  return NextResponse.json({ updated: ids.length });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];

  if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 });

  await deleteProducts(session.user.id, ids);
  return NextResponse.json({ deleted: ids.length });
}
