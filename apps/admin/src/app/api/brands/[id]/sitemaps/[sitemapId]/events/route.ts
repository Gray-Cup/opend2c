import { NextRequest } from "next/server";
import { getServerSession, isAdmin } from "@/lib/session";
import { adminGetSitemap } from "@/lib/store";

type Ctx = { params: Promise<{ sitemapId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { sitemapId } = await params;
  const sid = Number(sitemapId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const heartbeat = setInterval(() =>
        controller.enqueue(encoder.encode(`:ping\n\n`)), 15_000);

      try {
        while (true) {
          if (req.signal.aborted) break;
          const sitemap = await adminGetSitemap(sid);
          if (!sitemap) { send({ type: "error", message: "Not found" }); break; }

          send({
            type: sitemap.status,
            scraped: sitemap.progress_scraped,
            total: sitemap.progress_total,
            product_count: sitemap.product_count,
            error: sitemap.error,
          });

          if (sitemap.status === "done" || sitemap.status === "failed") break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
