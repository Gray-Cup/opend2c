import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

type SyncProduct = {
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
};

type SyncBody = {
  jobId: string;
  scraped?: number;
  total?: number;
  done?: boolean;
  products: SyncProduct[];
};

function productHasIssue(price: string | null, image: string | null): boolean {
  if (!image) return true;
  if (!price || price.trim() === "") return true;
  const numeric = price.trim().replace(/^[A-Z₹$€£¥\s]+/i, "").trim();
  return /^0+(\.0+)?$/.test(numeric);
}

export async function syncRoutes(app: FastifyInstance) {
  // POST /sync — called by the Go crawler after each batch
  // Authenticated with WORKER_SECRET
  app.post<{ Body: SyncBody }>("/sync", async (req, reply) => {
    const secret = process.env.WORKER_SECRET ?? "";
    const auth   = req.headers.authorization ?? "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const body = req.body;
    if (!body?.jobId || !Array.isArray(body?.products)) {
      return reply.status(400).send({ error: "invalid payload" });
    }

    const { jobId, products } = body;

    for (const p of products) {
      if (!p.source_url) continue;
      const status = productHasIssue(p.price, p.image) ? "draft" : "active";
      await db.query(
        `INSERT INTO products (job_id, source_url, title, image, shop, price, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (source_url) DO UPDATE SET
           title      = EXCLUDED.title,
           image      = EXCLUDED.image,
           shop       = EXCLUDED.shop,
           price      = EXCLUDED.price,
           currency   = EXCLUDED.currency,
           status     = CASE
             WHEN products.status = 'active'
               AND (EXCLUDED.image IS NULL OR EXCLUDED.price IS NULL OR EXCLUDED.price = '')
             THEN 'draft'
             WHEN products.status = 'draft'
               AND EXCLUDED.image IS NOT NULL
               AND EXCLUDED.price IS NOT NULL
               AND EXCLUDED.price != ''
             THEN 'active'
             ELSE products.status
           END,
           updated_at = NOW()`,
        [jobId, p.source_url, p.title, p.image, p.shop, p.price, p.currency, status],
      );
    }

    return reply.send({ synced: products.length });
  });
}
