const workerURL = () =>
  (process.env.CRAWLER_WORKER_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let workerRes: Response;
  try {
    workerRes = await fetch(`${workerURL()}/jobs/${id}/events`, {
      headers: { Accept: "text/event-stream" },
      signal: req.signal,
    });
  } catch {
    return new Response(JSON.stringify({ error: "worker unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!workerRes.ok || !workerRes.body) {
    const body = await workerRes.text();
    return new Response(body, { status: workerRes.status });
  }

  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
