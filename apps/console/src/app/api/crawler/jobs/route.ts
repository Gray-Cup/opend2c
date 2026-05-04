import { NextRequest, NextResponse } from "next/server";

const workerURL = () => {
  const url = process.env.CRAWLER_WORKER_URL ?? "http://localhost:8080";
  return url.replace(/\/$/, "");
};

export async function GET() {
  const res = await fetch(`${workerURL()}/jobs`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${workerURL()}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
