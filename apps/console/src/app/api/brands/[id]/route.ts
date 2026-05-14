import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { deleteBrand, getBrandById, updateBrand } from "@/lib/scraper-store";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const brand = await getBrandById(session.user.id, Number(id));
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(brand);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const input: Record<string, unknown> = {};
  if (typeof body?.name === "string") input.name = body.name.trim();
  if (typeof body?.slug === "string") input.slug = slugify(body.slug);
  if (typeof body?.description === "string") input.description = body.description.trim();
  for (const key of ["logo_url", "banner_url", "website_url", "twitter_url", "instagram_url"] as const) {
    if (key in body) input[key] = typeof body[key] === "string" ? body[key].trim() || null : null;
  }
  if (Array.isArray(body?.categories)) {
    input.categories = body.categories.filter((c: unknown) => typeof c === "string");
  }

  try {
    const brand = await updateBrand(session.user.id, Number(id), input);
    if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(brand);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update brand" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteBrand(session.user.id, Number(id));
  return NextResponse.json({ deleted: true });
}
