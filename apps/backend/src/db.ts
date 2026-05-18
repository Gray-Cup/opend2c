import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/opend2c?sslmode=disable",
});

export async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          BIGSERIAL PRIMARY KEY,
      job_id      TEXT        NOT NULL,
      source_url  TEXT        NOT NULL,
      title       TEXT        NOT NULL,
      image       TEXT,
      shop        TEXT        NOT NULL,
      price       TEXT,
      currency    TEXT,
      status      TEXT        NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(source_url)
    );

    CREATE INDEX IF NOT EXISTS idx_products_status  ON products(status);
    CREATE INDEX IF NOT EXISTS idx_products_shop    ON products(shop);
    CREATE INDEX IF NOT EXISTS idx_products_job_id  ON products(job_id);
  `);

  // Trigram search
  await db.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).catch(() => {});
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_products_trgm_title ON products USING GIN (title gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_products_trgm_shop  ON products USING GIN (shop  gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_products_fts
      ON products USING GIN (to_tsvector('english', title || ' ' || shop));
  `).catch(() => {});
}

export type Product = {
  id: number;
  job_id: string;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
