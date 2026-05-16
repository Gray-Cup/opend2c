import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3003",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "local-development-secret-change-me-please-32",
  emailAndPassword: { enabled: true },
});
