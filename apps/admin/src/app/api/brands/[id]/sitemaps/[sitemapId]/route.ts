import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import {
  adminDeleteSitemap,
  adminResyncSitemap,
  adminGetSitemap,
  adminUpsertProducts,
  adminMarkSitemapDone,
  adminMarkSitemapFailed,
  adminUpdateSitemapProgress,
} from "@/lib/store";
import { scrapeProductsFromSitemap } from "@/lib/sitemap-scraper";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string; sitemapId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { sitemapId } = await params;
  await adminDeleteSitemap(Number(sitemapId));
  return NextResponse.json({ deleted: true });
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, sitemapId } = await params;
  const sid = Number(sitemapId);
  const sitemap = await adminGetSitemap(sid);
  if (!sitemap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminResyncSitemap(sid);

  const { rows } = await db.query<{ user_id: string }>(
    `SELECT user_id FROM brands WHERE id = $1`, [Number(id)],
  );
  const userId = rows[0]?.user_id;

  void (async () => {
    try {
      const products = await scrapeProductsFromSitemap(sitemap.url, async (scraped, total) => {
        await adminUpdateSitemapProgress(sid, scraped, total);
      });
      await adminUpsertProducts(userId, sid, products);
      await adminMarkSitemapDone(sid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      await adminMarkSitemapFailed(sid, msg);
    }
  })();

  return NextResponse.json({ resyncing: true });
}
