import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import {
  adminListSitemaps,
  adminCreateSitemap,
  adminUpsertProducts,
  adminMarkSitemapDone,
  adminMarkSitemapFailed,
  adminUpdateSitemapProgress,
} from "@/lib/store";
import { scrapeProductsFromSitemap } from "@/lib/sitemap-scraper";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const sitemaps = await adminListSitemaps(Number(id));
  return NextResponse.json(sitemaps);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const brandId = Number(id);
  const body = await req.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

  if (!rawUrl) return NextResponse.json({ error: "Sitemap URL is required" }, { status: 400 });

  let url: string;
  try { url = new URL(rawUrl).toString(); }
  catch { return NextResponse.json({ error: "Invalid sitemap URL" }, { status: 400 }); }

  const sitemapId = await adminCreateSitemap(brandId, url);

  // Get userId for upsertProducts
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT user_id FROM brands WHERE id = $1`, [brandId],
  );
  const userId = rows[0]?.user_id;

  void (async () => {
    try {
      const products = await scrapeProductsFromSitemap(url, async (scraped, total) => {
        await adminUpdateSitemapProgress(sitemapId, scraped, total);
      });
      await adminUpsertProducts(userId, sitemapId, products);
      await adminMarkSitemapDone(sitemapId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      await adminMarkSitemapFailed(sitemapId, msg);
    }
  })();

  return NextResponse.json({ id: sitemapId }, { status: 202 });
}
