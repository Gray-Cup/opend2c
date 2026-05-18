import type { FastifyInstance } from "fastify";
import { db, type Product } from "../db.js";

export async function productsRoutes(app: FastifyInstance) {
  // GET /products?limit=60&offset=0&sort=newest&shop=innovist
  app.get<{
    Querystring: { limit?: string; offset?: string; sort?: string; shop?: string };
  }>("/products", async (req, reply) => {
    const limit  = Math.min(Number(req.query.limit  ?? 60), 200);
    const offset = Number(req.query.offset ?? 0);
    const sort   = req.query.sort ?? "newest";
    const shop   = req.query.shop;

    const conditions = ["status = 'active'"];
    const values: unknown[] = [];

    if (shop) {
      values.push(shop);
      conditions.push(`shop = $${values.length}`);
    }

    const where = conditions.join(" AND ");

    const orderBy =
      sort === "price_asc"
        ? `price IS NULL ASC, (REGEXP_REPLACE(price, '^[^0-9]*', ''))::numeric ASC NULLS LAST`
        : sort === "price_desc"
        ? `price IS NULL ASC, (REGEXP_REPLACE(price, '^[^0-9]*', ''))::numeric DESC NULLS LAST`
        : `updated_at DESC, id DESC`;

    const [{ rows: countRows }, { rows }] = await Promise.all([
      db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM products WHERE ${where}`, values),
      db.query<Product>(
        `SELECT id, source_url, title, image, shop, price, currency, created_at::text, updated_at::text
         FROM products WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
      ),
    ]);

    return reply.send({ products: rows, total: Number(countRows[0]?.count ?? 0) });
  });

  // GET /products/search?q=moisturizer&limit=60&sort=relevance
  app.get<{
    Querystring: { q?: string; limit?: string; sort?: string };
  }>("/products/search", async (req, reply) => {
    const q     = (req.query.q ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 60), 200);
    const sort  = req.query.sort ?? "relevance";

    if (!q) return reply.send({ products: [], total: 0 });

    const orderBy =
      sort === "price_asc"
        ? `price IS NULL ASC, (REGEXP_REPLACE(price, '^[^0-9]*', ''))::numeric ASC NULLS LAST`
        : sort === "price_desc"
        ? `price IS NULL ASC, (REGEXP_REPLACE(price, '^[^0-9]*', ''))::numeric DESC NULLS LAST`
        : sort === "newest"
        ? `created_at DESC, id DESC`
        : `(
            ts_rank(to_tsvector('english', title || ' ' || shop), plainto_tsquery('english', $1))
            + GREATEST(similarity(title, $1), similarity(shop, $1))
          ) DESC`;

    const { rows } = await db.query<Product>(
      `SELECT id, source_url, title, image, shop, price, currency, created_at::text, updated_at::text
       FROM products
       WHERE status = 'active'
         AND (
           to_tsvector('english', title || ' ' || shop) @@ plainto_tsquery('english', $1)
           OR similarity(title, $1) > 0.12
           OR similarity(shop,  $1) > 0.2
         )
       ORDER BY ${orderBy}
       LIMIT $2`,
      [q, limit],
    );

    return reply.send({ products: rows, total: rows.length });
  });

  // GET /shops — distinct shop names with product counts (replaces brand listing for web)
  app.get("/shops", async (_req, reply) => {
    const { rows } = await db.query<{ shop: string; product_count: number }>(
      `SELECT shop, COUNT(*)::int AS product_count
       FROM products WHERE status = 'active'
       GROUP BY shop ORDER BY shop ASC`,
    );
    return reply.send(rows);
  });
}
