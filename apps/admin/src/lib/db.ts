import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/opend2c?sslmode=disable";

declare global {
  // eslint-disable-next-line no-var
  var __adminPgPool: Pool | undefined;
}

export const db =
  globalThis.__adminPgPool ??
  new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalThis.__adminPgPool = db;
}
