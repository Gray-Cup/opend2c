import Fastify from "fastify";
import cors from "@fastify/cors";
import { migrate } from "./db.js";
import { productsRoutes } from "./routes/products.js";
import { jobsRoutes } from "./routes/jobs.js";
import { syncRoutes } from "./routes/sync.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [
    "https://opend2c.com",
    "https://www.opend2c.com",
    "https://console.opend2c.com",
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003"]
      : []),
  ],
});

await migrate();

app.get("/health", async () => ({ ok: true }));

await app.register(productsRoutes);
await app.register(jobsRoutes);
await app.register(syncRoutes);

await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: "0.0.0.0",
});
