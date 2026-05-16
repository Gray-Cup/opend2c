import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import { adminListAllBrands, adminCreateBrand } from "@/lib/store";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const brands = await adminListAllBrands();
  return NextResponse.json(brands);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const ownerEmail = typeof body?.owner_email === "string" ? body.owner_email.trim() : "";
  const websiteUrl = typeof body?.website_url === "string" ? body.website_url.trim() || null : null;

  if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  if (!ownerEmail) return NextResponse.json({ error: "Owner email is required" }, { status: 400 });

  const slug = slugify(typeof body?.slug === "string" && body.slug ? body.slug : name);
  const result = await adminCreateBrand(ownerEmail, { slug, name, website_url: websiteUrl });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.brand, { status: 201 });
}
