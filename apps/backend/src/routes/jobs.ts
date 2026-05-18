import type { FastifyInstance } from "fastify";

type CreateJobBody = {
  sitemap_url: string;
  sitemap_id?: number;
  console_user_id?: string;
  batch_size?: number;
  batch_pause_secs?: number;
};

// Proxies job creation from the console to the crawler over the internal Zerops network.
// Console authenticates with API_SECRET; backend forwards with WORKER_SECRET.
export async function jobsRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateJobBody }>("/jobs", async (req, reply) => {
    const apiSecret = process.env.API_SECRET ?? "";
    const auth      = req.headers.authorization ?? "";
    if (!apiSecret || auth !== `Bearer ${apiSecret}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const body = req.body;
    if (!body?.sitemap_url) {
      return reply.status(400).send({ error: "sitemap_url required" });
    }

    const crawlerURL    = (process.env.CRAWLER_INTERNAL_URL ?? "http://crawler:8080").replace(/\/$/, "");
    const workerSecret  = process.env.WORKER_SECRET ?? "";

    // Forward to crawler on the internal Zerops network
    // Rewrite CONSOLE_URL so the crawler syncs back to this backend, not the console
    const res = await fetch(`${crawlerURL}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({
        sitemap_url:      body.sitemap_url,
        sitemap_id:       body.sitemap_id   ?? 0,
        console_user_id:  body.console_user_id ?? "",
        batch_size:       body.batch_size       ?? 50,
        batch_pause_secs: body.batch_pause_secs ?? 120,
      }),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  // GET /jobs/:id — proxy job status from crawler
  app.get<{ Params: { id: string } }>("/jobs/:id", async (req, reply) => {
    const apiSecret = process.env.API_SECRET ?? "";
    const auth      = req.headers.authorization ?? "";
    if (!apiSecret || auth !== `Bearer ${apiSecret}`) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const crawlerURL   = (process.env.CRAWLER_INTERNAL_URL ?? "http://crawler:8080").replace(/\/$/, "");
    const workerSecret = process.env.WORKER_SECRET ?? "";

    const res = await fetch(`${crawlerURL}/jobs/${req.params.id}`, {
      headers: { "Authorization": `Bearer ${workerSecret}` },
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });
}
