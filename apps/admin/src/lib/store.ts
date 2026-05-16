import { db } from "@/lib/db";

const ISSUE_SQL = `(
  p.image IS NULL
  OR p.price IS NULL
  OR TRIM(p.price) = ''
  OR TRIM(p.price) ~ '^[A-Z₹$€£¥\\s]*0+(\\.0+)?$'
)`;

export type AdminBrand = {
  id: number;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  categories: string[];
  product_count: number;
  sitemap_count: number;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSitemap = {
  id: number;
  user_id: string;
  brand_id: number | null;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  product_count: number;
  progress_scraped: number;
  progress_total: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProduct = {
  id: number;
  sitemap_id: number;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
  status: string;
  notes: string;
  click_count: number;
  has_issue: boolean;
  created_at: string;
  updated_at: string;
};

export async function adminListAllBrands(): Promise<AdminBrand[]> {
  const { rows } = await db.query<AdminBrand>(`
    SELECT
      b.id, b.user_id, b.slug, b.name, b.description,
      b.logo_url, b.banner_url, b.website_url, b.categories,
      COUNT(DISTINCT p.id)::int AS product_count,
      COUNT(DISTINCT s.id)::int AS sitemap_count,
      u.email AS owner_email,
      b.created_at::text, b.updated_at::text
    FROM brands b
    LEFT JOIN scraper_sitemaps s ON s.brand_id = b.id
    LEFT JOIN scraper_products p ON p.sitemap_id = s.id
    LEFT JOIN "user" u ON u.id = b.user_id
    GROUP BY b.id, u.email
    ORDER BY b.created_at DESC
  `);
  return rows;
}

export async function adminGetBrand(brandId: number): Promise<AdminBrand | null> {
  const { rows } = await db.query<AdminBrand>(`
    SELECT
      b.id, b.user_id, b.slug, b.name, b.description,
      b.logo_url, b.banner_url, b.website_url, b.categories,
      COUNT(DISTINCT p.id)::int AS product_count,
      COUNT(DISTINCT s.id)::int AS sitemap_count,
      u.email AS owner_email,
      b.created_at::text, b.updated_at::text
    FROM brands b
    LEFT JOIN scraper_sitemaps s ON s.brand_id = b.id
    LEFT JOIN scraper_products p ON p.sitemap_id = s.id
    LEFT JOIN "user" u ON u.id = b.user_id
    WHERE b.id = $1
    GROUP BY b.id, u.email
  `, [brandId]);
  return rows[0] ?? null;
}

export async function adminCreateBrand(
  ownerEmail: string,
  input: { slug: string; name: string; website_url?: string | null },
): Promise<{ brand?: AdminBrand; error?: string }> {
  const { rows: userRows } = await db.query<{ id: string }>(
    `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
    [ownerEmail.toLowerCase().trim()],
  );
  if (!userRows[0]) return { error: "No account found with that email" };
  const userId = userRows[0].id;

  try {
    const { rows } = await db.query<AdminBrand>(
      `INSERT INTO brands (user_id, slug, name, description, website_url, categories)
       VALUES ($1, $2, $3, '', $4, '{}')
       RETURNING id, user_id, slug, name, description, logo_url, banner_url,
                 website_url, categories, 0 AS product_count, 0 AS sitemap_count,
                 $5 AS owner_email, created_at::text, updated_at::text`,
      [userId, input.slug, input.name, input.website_url ?? null, ownerEmail],
    );
    return { brand: rows[0] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Slug already taken — try a different one" };
    }
    return { error: "Could not create brand" };
  }
}

export async function adminTransferBrand(
  brandId: number,
  toEmail: string,
): Promise<{ error?: string }> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
    [toEmail.toLowerCase().trim()],
  );
  if (!rows[0]) return { error: "No account found with that email" };
  const result = await db.query(
    `UPDATE brands SET user_id=$1, updated_at=NOW() WHERE id=$2`,
    [rows[0].id, brandId],
  );
  if (result.rowCount === 0) return { error: "Brand not found" };
  return {};
}

export async function adminListSitemaps(brandId: number): Promise<AdminSitemap[]> {
  const { rows } = await db.query<AdminSitemap>(`
    SELECT s.id, s.user_id, s.brand_id, s.url, s.status,
           COUNT(p.id)::int AS product_count,
           s.progress_scraped, s.progress_total,
           s.error, s.created_at::text, s.updated_at::text
    FROM scraper_sitemaps s
    LEFT JOIN scraper_products p ON p.sitemap_id = s.id
    WHERE s.brand_id = $1
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `, [brandId]);
  return rows;
}

export async function adminGetSitemap(sitemapId: number): Promise<AdminSitemap | null> {
  const { rows } = await db.query<AdminSitemap>(`
    SELECT s.id, s.user_id, s.brand_id, s.url, s.status,
           COUNT(p.id)::int AS product_count,
           s.progress_scraped, s.progress_total,
           s.error, s.created_at::text, s.updated_at::text
    FROM scraper_sitemaps s
    LEFT JOIN scraper_products p ON p.sitemap_id = s.id
    WHERE s.id = $1
    GROUP BY s.id
  `, [sitemapId]);
  return rows[0] ?? null;
}

export async function adminCreateSitemap(brandId: number, url: string): Promise<number> {
  const { rows: brandRows } = await db.query<{ user_id: string }>(
    `SELECT user_id FROM brands WHERE id = $1`,
    [brandId],
  );
  if (!brandRows[0]) throw new Error("Brand not found");

  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO scraper_sitemaps (user_id, brand_id, url, status)
     VALUES ($1, $2, $3, 'running') RETURNING id`,
    [brandRows[0].user_id, brandId, url],
  );
  return rows[0].id;
}

export async function adminDeleteSitemap(sitemapId: number): Promise<void> {
  await db.query(`DELETE FROM scraper_sitemaps WHERE id=$1`, [sitemapId]);
}

export async function adminResyncSitemap(sitemapId: number): Promise<void> {
  await db.query(
    `UPDATE scraper_sitemaps
     SET status='running', progress_scraped=0, progress_total=0, error=NULL, updated_at=NOW()
     WHERE id=$1`,
    [sitemapId],
  );
}

export async function adminUpdateSitemapProgress(
  id: number, scraped: number, total: number,
): Promise<void> {
  await db.query(
    `UPDATE scraper_sitemaps SET progress_scraped=$2, progress_total=$3, updated_at=NOW() WHERE id=$1`,
    [id, scraped, total],
  );
}

export async function adminMarkSitemapDone(id: number): Promise<void> {
  await db.query(
    `UPDATE scraper_sitemaps SET status='done', error=NULL, updated_at=NOW() WHERE id=$1`,
    [id],
  );
}

export async function adminMarkSitemapFailed(id: number, error: string): Promise<void> {
  await db.query(
    `UPDATE scraper_sitemaps SET status='failed', error=$2, updated_at=NOW() WHERE id=$1`,
    [id, error],
  );
}

export async function adminUpsertProducts(
  userId: string,
  sitemapId: number,
  products: Array<{
    source_url: string; title: string; image: string | null;
    shop: string; price: string | null; currency: string | null;
  }>,
): Promise<void> {
  for (const p of products) {
    const hasIssue = !p.image || !p.price || p.price.trim() === "";
    const status = hasIssue ? "draft" : "active";
    await db.query(
      `INSERT INTO scraper_products
         (sitemap_id, user_id, source_url, title, image, shop, price, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, source_url) DO UPDATE SET
         sitemap_id = EXCLUDED.sitemap_id,
         title      = EXCLUDED.title,
         image      = EXCLUDED.image,
         shop       = EXCLUDED.shop,
         price      = EXCLUDED.price,
         currency   = EXCLUDED.currency,
         status     = EXCLUDED.status,
         updated_at = NOW()`,
      [sitemapId, userId, p.source_url, p.title, p.image, p.shop, p.price, p.currency, status],
    );
  }
}

export async function adminListProducts(
  brandId: number,
  opts: {
    limit: number;
    offset: number;
    status?: string;
    q?: string;
    issues?: boolean;
  },
): Promise<{ products: AdminProduct[]; total: number }> {
  const conditions: string[] = ["s.brand_id = $1"];
  const values: unknown[] = [brandId];

  if (opts.status && opts.status !== "all") {
    values.push(opts.status);
    conditions.push(`p.status = $${values.length}`);
  }

  if (opts.q) {
    values.push(`%${opts.q.toLowerCase()}%`);
    const idx = values.length;
    conditions.push(`(LOWER(p.title) LIKE $${idx} OR LOWER(p.shop) LIKE $${idx})`);
  }

  if (opts.issues) {
    conditions.push(ISSUE_SQL);
  }

  const where = conditions.join(" AND ");
  const fromJoin = `FROM scraper_products p JOIN scraper_sitemaps s ON s.id = p.sitemap_id`;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${fromJoin} WHERE ${where}`,
      values,
    ),
    db.query<AdminProduct & { has_issue: boolean }>(
      `SELECT p.id, p.sitemap_id, p.source_url, p.title, p.image, p.shop,
              p.price, p.currency, p.status, p.notes, p.click_count,
              ${ISSUE_SQL} AS has_issue,
              p.created_at::text, p.updated_at::text
       ${fromJoin}
       WHERE ${where}
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, opts.limit, opts.offset],
    ),
  ]);

  return { products: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function adminUpdateProduct(
  productId: number,
  input: Partial<{ status: string; title: string; price: string | null; notes: string }>,
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(input)) {
    values.push(v);
    fields.push(`${k} = $${values.length}`);
  }
  if (!fields.length) return;
  values.push(productId);
  await db.query(
    `UPDATE scraper_products SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${values.length}`,
    values,
  );
}
