import { NextRequest, NextResponse } from "next/server";
import { getAllActiveProducts, searchActiveProducts } from "@/lib/scraper-store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const products = q
    ? await searchActiveProducts(q)
    : await getAllActiveProducts();

  return NextResponse.json(products);
}
