import { db } from "@/lib/db";

export type SavedSitemap = {
  id: number;
  user_id: string;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  product_count: number;
  progress_scraped: number;
  progress_total: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedProduct = {
  id: number;
  sitemap_id: number;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
  status: "draft" | "active" | "archived";
  notes: string;
  click_count: number;
  created_at: string;
  updated_at: string;
};

export type Brand = {
  id: number;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

let initialized = false;

export async function ensureScraperTables() {
  if (initialized) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS scraper_sitemaps (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      progress_scraped INT NOT NULL DEFAULT 0,
      progress_total INT NOT NULL DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scraper_products (
      id BIGSERIAL PRIMARY KEY,
      sitemap_id BIGINT NOT NULL REFERENCES scraper_sitemaps(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      image TEXT,
      shop TEXT NOT NULL,
      price TEXT,
      currency TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, source_url)
    );

    CREATE TABLE IF NOT EXISTS brands (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      logo_url TEXT,
      website_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(slug)
    );

    CREATE INDEX IF NOT EXISTS idx_scraper_sitemaps_user_id ON scraper_sitemaps(user_id);
    CREATE INDEX IF NOT EXISTS idx_scraper_products_user_id ON scraper_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_scraper_products_sitemap_id ON scraper_products(sitemap_id);
    CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);
    CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
  `);

  // Migrate existing tables that may lack new columns
  await db.query(`
    ALTER TABLE scraper_sitemaps ADD COLUMN IF NOT EXISTS progress_scraped INT NOT NULL DEFAULT 0;
    ALTER TABLE scraper_sitemaps ADD COLUMN IF NOT EXISTS progress_total INT NOT NULL DEFAULT 0;
  `).catch(() => {});

  await db.query(`
    ALTER TABLE scraper_products ADD COLUMN IF NOT EXISTS click_count INT NOT NULL DEFAULT 0;
  `).catch(() => {});

  await db.query(`
    CREATE TABLE IF NOT EXISTS product_click_events (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_click_events_product_id ON product_click_events(product_id);
    CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON product_click_events(clicked_at);
  `).catch(() => {});

  initialized = true;
}

export async function listSitemaps(userId: string): Promise<SavedSitemap[]> {
  await ensureScraperTables();
  const { rows } = await db.query<SavedSitemap>(
    `
      SELECT s.id, s.user_id, s.url, s.status, COUNT(p.id)::int AS product_count,
             s.progress_scraped, s.progress_total,
             s.error, s.created_at::text, s.updated_at::text
      FROM scraper_sitemaps s
      LEFT JOIN scraper_products p ON p.sitemap_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `,
    [userId],
  );
  return rows;
}

export async function getSitemap(id: number): Promise<SavedSitemap | null> {
  await ensureScraperTables();
  const { rows } = await db.query<SavedSitemap>(
    `
      SELECT s.id, s.user_id, s.url, s.status, COUNT(p.id)::int AS product_count,
             s.progress_scraped, s.progress_total,
             s.error, s.created_at::text, s.updated_at::text
      FROM scraper_sitemaps s
      LEFT JOIN scraper_products p ON p.sitemap_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `,
    [id],
  );
  return rows[0] ?? null;
}

export async function createSitemap(userId: string, url: string) {
  await ensureScraperTables();
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO scraper_sitemaps (user_id, url, status) VALUES ($1, $2, 'running') RETURNING id`,
    [userId, url],
  );
  return rows[0].id;
}

export async function updateSitemapProgress(id: number, scraped: number, total: number) {
  await db.query(
    `UPDATE scraper_sitemaps SET progress_scraped=$2, progress_total=$3, updated_at=NOW() WHERE id=$1`,
    [id, scraped, total],
  );
}

export async function markSitemapDone(id: number) {
  await db.query(
    `UPDATE scraper_sitemaps SET status='done', error=NULL, updated_at=NOW() WHERE id=$1`,
    [id],
  );
}

export async function markSitemapFailed(id: number, error: string) {
  await db.query(
    `UPDATE scraper_sitemaps SET status='failed', error=$2, updated_at=NOW() WHERE id=$1`,
    [id, error],
  );
}

export async function deleteSitemap(id: number, userId: string) {
  await db.query(
    `DELETE FROM scraper_sitemaps WHERE id=$1 AND user_id=$2`,
    [id, userId],
  );
}

export async function resetSitemapForResync(id: number, userId: string) {
  await db.query(
    `UPDATE scraper_sitemaps
     SET status='running', progress_scraped=0, progress_total=0, error=NULL, updated_at=NOW()
     WHERE id=$1 AND user_id=$2`,
    [id, userId],
  );
}

export async function upsertProducts(
  userId: string,
  sitemapId: number,
  products: Array<{
    source_url: string;
    title: string;
    image: string | null;
    shop: string;
    price: string | null;
    currency: string | null;
  }>,
) {
  for (const product of products) {
    await db.query(
      `
        INSERT INTO scraper_products
          (sitemap_id, user_id, source_url, title, image, shop, price, currency)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, source_url)
        DO UPDATE SET
          sitemap_id=EXCLUDED.sitemap_id,
          title=EXCLUDED.title,
          image=EXCLUDED.image,
          shop=EXCLUDED.shop,
          price=EXCLUDED.price,
          currency=EXCLUDED.currency,
          updated_at=NOW()
      `,
      [
        sitemapId,
        userId,
        product.source_url,
        product.title,
        product.image,
        product.shop,
        product.price,
        product.currency,
      ],
    );
  }
}

export async function listProducts(
  userId: string,
  opts: { limit: number; offset: number; status?: string; q?: string; hasIssues?: boolean } = { limit: 10, offset: 0 },
): Promise<{ products: SavedProduct[]; total: number }> {
  await ensureScraperTables();

  const conditions: string[] = ["user_id = $1"];
  const values: unknown[]   = [userId];

  if (opts.status && opts.status !== "all") {
    values.push(opts.status);
    conditions.push(`status = $${values.length}`);
  }

  if (opts.q) {
    values.push(`%${opts.q.toLowerCase()}%`);
    const idx = values.length;
    conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(shop) LIKE $${idx})`);
  }

  if (opts.hasIssues) {
    conditions.push(`(image IS NULL OR price IS NULL OR TRIM(price) = '')`);
  }

  const where = conditions.join(" AND ");

  const [{ rows: countRows }, { rows }] = await Promise.all([
    db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM scraper_products WHERE ${where}`, values),
    db.query<SavedProduct>(
      `SELECT id, sitemap_id, source_url, title, image, shop, price, currency,
              status, notes, click_count, created_at::text, updated_at::text
       FROM scraper_products
       WHERE ${where}
       ORDER BY updated_at DESC, id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, opts.limit, opts.offset],
    ),
  ]);

  return { products: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function updateProduct(
  userId: string,
  id: number,
  input: Partial<Pick<SavedProduct, "title" | "price" | "currency" | "status" | "notes">>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }

  if (fields.length === 0) return null;

  values.push(userId, id);
  const { rows } = await db.query<SavedProduct>(
    `
      UPDATE scraper_products
      SET ${fields.join(", ")}, updated_at=NOW()
      WHERE user_id = $${values.length - 1} AND id = $${values.length}
      RETURNING id, sitemap_id, source_url, title, image, shop, price, currency,
                status, notes, click_count, created_at::text, updated_at::text
    `,
    values,
  );
  return rows[0] ?? null;
}

// ─── Products delete ──────────────────────────────────────────────────────────

export async function deleteProducts(userId: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
  await db.query(
    `DELETE FROM scraper_products WHERE user_id=$1 AND id IN (${placeholders})`,
    [userId, ...ids],
  );
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function getBrandByUserId(userId: string): Promise<Brand | null> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `SELECT id, user_id, slug, name, description, logo_url, website_url,
            created_at::text, updated_at::text
     FROM brands WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function listBrandsByUserId(userId: string): Promise<Brand[]> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `SELECT id, user_id, slug, name, description, logo_url, website_url,
            created_at::text, updated_at::text
     FROM brands WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  return rows;
}

export async function getBrandById(userId: string, id: number): Promise<Brand | null> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `SELECT id, user_id, slug, name, description, logo_url, website_url,
            created_at::text, updated_at::text
     FROM brands WHERE user_id = $1 AND id = $2`,
    [userId, id],
  );
  return rows[0] ?? null;
}

export async function createBrand(
  userId: string,
  input: Pick<Brand, "slug" | "name" | "description" | "logo_url" | "website_url">,
): Promise<Brand> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `INSERT INTO brands (user_id, slug, name, description, logo_url, website_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, slug, name, description, logo_url, website_url,
               created_at::text, updated_at::text`,
    [userId, input.slug, input.name, input.description, input.logo_url, input.website_url],
  );
  return rows[0];
}

export async function updateBrand(
  userId: string,
  id: number,
  input: Partial<Pick<Brand, "slug" | "name" | "description" | "logo_url" | "website_url">>,
): Promise<Brand | null> {
  await ensureScraperTables();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(input)) {
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }
  if (fields.length === 0) return getBrandById(userId, id);
  values.push(userId, id);
  const { rows } = await db.query<Brand>(
    `UPDATE brands SET ${fields.join(", ")}, updated_at=NOW()
     WHERE user_id=$${values.length - 1} AND id=$${values.length}
     RETURNING id, user_id, slug, name, description, logo_url, website_url,
               created_at::text, updated_at::text`,
    values,
  );
  return rows[0] ?? null;
}

export async function deleteBrand(userId: string, id: number): Promise<void> {
  await db.query(`DELETE FROM brands WHERE user_id=$1 AND id=$2`, [userId, id]);
}

export async function transferBrand(
  id: number,
  fromUserId: string,
  toEmail: string,
): Promise<{ error?: string }> {
  await ensureScraperTables();
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [toEmail.toLowerCase().trim()],
  );
  if (!rows[0]) return { error: "No account found with that email" };
  const toUserId = rows[0].id;
  const result = await db.query(
    `UPDATE brands SET user_id=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3`,
    [toUserId, id, fromUserId],
  );
  if (result.rowCount === 0) return { error: "Brand not found or not owned by you" };
  return {};
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `SELECT id, user_id, slug, name, description, logo_url, website_url,
            created_at::text, updated_at::text
     FROM brands WHERE slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function upsertBrand(
  userId: string,
  input: Pick<Brand, "slug" | "name" | "description" | "logo_url" | "website_url">,
): Promise<Brand> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand>(
    `
      INSERT INTO brands (user_id, slug, name, description, logo_url, website_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        logo_url = EXCLUDED.logo_url,
        website_url = EXCLUDED.website_url,
        updated_at = NOW()
      WHERE brands.user_id = $1
      RETURNING id, user_id, slug, name, description, logo_url, website_url,
                created_at::text, updated_at::text
    `,
    [userId, input.slug, input.name, input.description, input.logo_url, input.website_url],
  );
  return rows[0];
}

export async function listAllBrands(): Promise<(Brand & { product_count: number })[]> {
  await ensureScraperTables();
  const { rows } = await db.query<Brand & { product_count: number }>(
    `SELECT b.id, b.slug, b.name, b.description, b.logo_url, b.website_url,
            b.created_at::text, b.updated_at::text,
            COUNT(p.id)::int AS product_count
     FROM brands b
     LEFT JOIN scraper_products p
       ON p.user_id = b.user_id AND p.status = 'active'
     GROUP BY b.id
     ORDER BY b.name ASC`,
  );
  return rows;
}

export async function getPublicProducts(
  brandUserId: string,
): Promise<SavedProduct[]> {
  await ensureScraperTables();
  const { rows } = await db.query<SavedProduct>(
    `
      SELECT id, sitemap_id, source_url, title, image, shop, price, currency,
             status, notes, created_at::text, updated_at::text
      FROM scraper_products
      WHERE user_id = $1 AND status = 'active'
      ORDER BY updated_at DESC, id DESC
    `,
    [brandUserId],
  );
  return rows;
}

let productCache: { data: SavedProduct[]; expiresAt: number } | null = null;
const PRODUCT_CACHE_TTL_MS = 60_000; // 60 seconds

export async function getAllActiveProducts(): Promise<SavedProduct[]> {
  const now = Date.now();
  if (productCache && now < productCache.expiresAt) {
    return productCache.data;
  }
  await ensureScraperTables();
  const { rows } = await db.query<SavedProduct>(
    `
      SELECT id, sitemap_id, source_url, title, image, shop, price, currency,
             status, notes, created_at::text, updated_at::text
      FROM scraper_products
      WHERE status = 'active'
      ORDER BY updated_at DESC, id DESC
    `,
  );
  productCache = { data: rows, expiresAt: now + PRODUCT_CACHE_TTL_MS };
  return rows;
}

export function invalidateProductCache() {
  productCache = null;
}

export type DailyClicks = { date: string; clicks: number };

export type ClickAnalytics = {
  totalClicks: number;
  totalProducts: number;
  activeProducts: number;
  topProducts: { id: number; title: string; shop: string; source_url: string; click_count: number }[];
  dailyClicks: DailyClicks[];
};

export async function getClickAnalytics(startDate: Date, endDate: Date): Promise<ClickAnalytics> {
  await ensureScraperTables();
  const [{ rows: [summary] }, { rows: topProducts }, { rows: dailyRows }] = await Promise.all([
    db.query<{ total_clicks: string; total_products: string; active_products: string }>(`
      SELECT
        COALESCE(SUM(click_count), 0)::text AS total_clicks,
        COUNT(*)::text AS total_products,
        COUNT(*) FILTER (WHERE status = 'active')::text AS active_products
      FROM scraper_products
    `),
    db.query<{ id: number; title: string; shop: string; source_url: string; click_count: number }>(`
      SELECT id, title, shop, source_url, click_count
      FROM scraper_products
      WHERE click_count > 0
      ORDER BY click_count DESC
      LIMIT 10
    `),
    db.query<{ date: string; clicks: string }>(`
      SELECT
        DATE(clicked_at AT TIME ZONE 'UTC')::text AS date,
        COUNT(*)::text AS clicks
      FROM product_click_events
      WHERE clicked_at >= $1 AND clicked_at < $2
      GROUP BY DATE(clicked_at AT TIME ZONE 'UTC')
      ORDER BY date ASC
    `, [startDate, endDate]),
  ]);

  return {
    totalClicks: Number(summary?.total_clicks ?? 0),
    totalProducts: Number(summary?.total_products ?? 0),
    activeProducts: Number(summary?.active_products ?? 0),
    topProducts,
    dailyClicks: dailyRows.map((r) => ({ date: r.date, clicks: Number(r.clicks) })),
  };
}

export type IssueProduct = {
  id: number;
  title: string;
  shop: string;
  source_url: string;
  image: string | null;
  price: string | null;
  issues: string[];
};

export type ProductIssuesSummary = {
  total: number;
  noImage: number;
  noPrice: number;
  products: IssueProduct[];
};

export async function getProductIssuesSummary(userId: string): Promise<ProductIssuesSummary> {
  await ensureScraperTables();
  const { rows } = await db.query<{
    id: number; title: string; shop: string; source_url: string;
    image: string | null; price: string | null;
  }>(
    `SELECT id, title, shop, source_url, image, price
     FROM scraper_products
     WHERE user_id = $1
       AND status != 'archived'
       AND (image IS NULL OR price IS NULL OR price = '')
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId],
  );

  const products: IssueProduct[] = rows.map((r) => ({
    ...r,
    issues: [
      ...(!r.image           ? ["No image"]  : []),
      ...(!r.price || r.price === "" ? ["No price"]  : []),
    ],
  }));

  return {
    total:   products.length,
    noImage: rows.filter((r) => !r.image).length,
    noPrice: rows.filter((r) => !r.price || r.price === "").length,
    products,
  };
}

export async function trackProductClick(productId: number): Promise<void> {
  await ensureScraperTables();
  await Promise.all([
    db.query(`UPDATE scraper_products SET click_count = click_count + 1 WHERE id = $1`, [productId]),
    db.query(`INSERT INTO product_click_events (product_id) VALUES ($1)`, [productId]),
  ]);
  invalidateProductCache();
}

// Called by the crawler worker after a job completes.
// Creates a sentinel sitemap row so the FK is satisfied, then upserts products
// as active so they appear publicly immediately.
export async function syncCrawlerProducts(
  jobId: string,
  products: Array<{
    source_url: string;
    title: string;
    image: string | null;
    shop: string;
    price: string | null;
    currency: string | null;
  }>,
) {
  await ensureScraperTables();

  const systemUserId = `crawler:${jobId}`;

  // One sentinel sitemap row per crawler job — idempotent via user_id lookup
  const { rows: existing } = await db.query<{ id: number }>(
    `SELECT id FROM scraper_sitemaps WHERE user_id = $1 LIMIT 1`,
    [systemUserId],
  );

  let sitemapId: number;
  if (existing[0]) {
    sitemapId = existing[0].id;
  } else {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO scraper_sitemaps (user_id, url, status, progress_scraped, progress_total)
       VALUES ($1, $2, 'done', $3, $3) RETURNING id`,
      [systemUserId, `crawler-job:${jobId}`, products.length],
    );
    sitemapId = rows[0].id;
  }

  for (const p of products) {
    const hasIssues = !p.image || !p.price;
    const status = hasIssues ? "draft" : "active";
    await db.query(
      `INSERT INTO scraper_products
         (sitemap_id, user_id, source_url, title, image, shop, price, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, source_url) DO UPDATE SET
         title    = EXCLUDED.title,
         image    = EXCLUDED.image,
         shop     = EXCLUDED.shop,
         price    = EXCLUDED.price,
         currency = EXCLUDED.currency,
         status   = CASE
           WHEN scraper_products.status = 'active' AND ($5::text IS NULL OR $7::text IS NULL OR $7::text = '')
           THEN 'draft'
           WHEN scraper_products.status = 'draft'  AND ($5::text IS NOT NULL AND $7::text IS NOT NULL AND $7::text != '')
           THEN 'active'
           ELSE scraper_products.status
         END,
         updated_at = NOW()`,
      [sitemapId, systemUserId, p.source_url, p.title, p.image, p.shop, p.price, p.currency, status],
    );
  }

  invalidateProductCache();
}

export async function bulkUpdateProducts(
  userId: string,
  ids: number[],
  status: string,
): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 3}`).join(", ");
  await db.query(
    `UPDATE scraper_products SET status=$1, updated_at=NOW()
     WHERE user_id=$2 AND id IN (${placeholders})`,
    [status, userId, ...ids],
  );
}
