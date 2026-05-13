import { NextResponse } from "next/server";
import { listAllBrands } from "@/lib/scraper-store";

export const revalidate = 300;

export async function GET() {
  const brands = await listAllBrands();
  return NextResponse.json(brands);
}
