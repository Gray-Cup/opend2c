import { NextResponse } from "next/server";

const workerURL = () => {
  const url = process.env.CRAWLER_WORKER_URL ?? "http://localhost:8080";
  return url.replace(/\/$/, "");
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${workerURL()}/jobs/${id}`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
