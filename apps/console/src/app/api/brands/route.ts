import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { createBrand, listBrandsByUserId } from "@/lib/scraper-store";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brands = await listBrandsByUserId(session.user.id);
  return NextResponse.json(brands);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = slugify(typeof body?.slug === "string" ? body.slug : name);

  if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  try {
    const brand = await createBrand(session.user.id, {
      slug,
      name,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      logo_url: typeof body?.logo_url === "string" ? body.logo_url.trim() || null : null,
      banner_url: typeof body?.banner_url === "string" ? body.banner_url.trim() || null : null,
      website_url: typeof body?.website_url === "string" ? body.website_url.trim() || null : null,
      twitter_url: typeof body?.twitter_url === "string" ? body.twitter_url.trim() || null : null,
      instagram_url: typeof body?.instagram_url === "string" ? body.instagram_url.trim() || null : null,
      categories: Array.isArray(body?.categories) ? body.categories.filter((c: unknown) => typeof c === "string") : [],
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create brand" }, { status: 500 });
  }
}
