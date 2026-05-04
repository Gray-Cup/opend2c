"use client";

import { useState, useEffect, useRef } from "react";

const API = "/api/crawler";

type Variant = {
  label: string;
  price: string;
  currency: string;
  url: string;
};

type Product = {
  name: string;
  image: string;
  shop: string;
  variants: Variant[];
};

type JobProgress = {
  scraped: number;
  skipped: number;
  total: number;
};

type Job = {
  id: string;
  sites: string[];
  max_products: number;
  status: "queued" | "running" | "done" | "failed";
  progress: JobProgress;
  products: Product[];
  error?: string;
  created_at: string;
  updated_at: string;
};

type ProgressEvent = {
  type: "state" | "running" | "progress" | "done" | "failed" | "error";
  scraped?: number;
  skipped?: number;
  total?: number;
  product?: Product;
  message?: string;
};

function StatusPill({ status }: { status: Job["status"] }) {
  const map: Record<Job["status"], { label: string; cls: string }> = {
    queued:  { label: "Queued",  cls: "bg-gray-100 text-gray-600" },
    running: { label: "Running", cls: "bg-blue-100 text-blue-700" },
    done:    { label: "Done",    cls: "bg-emerald-100 text-emerald-700" },
    failed:  { label: "Failed",  cls: "bg-red-100 text-red-600" },
  };
  const { label, cls } = map[status] ?? map.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status === "running" && (
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}

function ProgressBar({ progress }: { progress: JobProgress }) {
  const pct = progress.total > 0 ? Math.round((progress.scraped / progress.total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {progress.scraped} scraped · {progress.skipped} skipped
        {progress.total > 0 && ` · ${pct}%`}
      </p>
    </div>
  );
}

export default function CrawlPage() {
  const [siteInput, setSiteInput]   = useState("");
  const [sites, setSites]           = useState<string[]>([]);
  const [maxProducts, setMaxProducts] = useState(100);
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob]   = useState<Job | null>(null);
  const [launching, setLaunching]   = useState(false);
  const [formError, setFormError]   = useState("");
  const esRef = useRef<EventSource | null>(null);

  // Load existing jobs on mount
  useEffect(() => {
    fetch(`${API}/jobs`)
      .then((r) => r.json())
      .then((data: Job[]) => {
        const list = data ?? [];
        setJobs(list);
        if (list.length > 0) {
          const first = list[0];
          setActiveJobId(first.id);
          setActiveJob(first);
        }
      })
      .catch(() => {});
  }, []);

  // Open SSE stream when active job changes
  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (!activeJobId) return;

    const es = new EventSource(`${API}/jobs/${activeJobId}/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      let ev: ProgressEvent;
      try { ev = JSON.parse(e.data); } catch { return; }

      setActiveJob((prev) => {
        if (!prev) return prev;
        const next: Job = { ...prev };

        if (ev.scraped !== undefined) next.progress = { ...next.progress, scraped: ev.scraped };
        if (ev.skipped !== undefined) next.progress = { ...next.progress, skipped: ev.skipped };
        if (ev.total   !== undefined) next.progress = { ...next.progress, total:   ev.total   };

        if (ev.type === "running") next.status = "running";
        if (ev.type === "done")    next.status = "done";
        if (ev.type === "failed" || ev.type === "error") next.status = "failed";

        if (ev.product) next.products = [...next.products, ev.product];

        return next;
      });

      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== activeJobId) return j;
          const next = { ...j };
          if (ev.scraped !== undefined) next.progress = { ...next.progress, scraped: ev.scraped };
          if (ev.skipped !== undefined) next.progress = { ...next.progress, skipped: ev.skipped };
          if (ev.total   !== undefined) next.progress = { ...next.progress, total:   ev.total   };
          if (ev.type === "running") next.status = "running";
          if (ev.type === "done")    next.status = "done";
          if (ev.type === "failed" || ev.type === "error") next.status = "failed";
          return next;
        })
      );

      if (ev.type === "done" || ev.type === "failed" || ev.type === "error") {
        es.close();
        // Fetch canonical final state (includes all products) from DB
        fetch(`${API}/jobs/${activeJobId}`)
          .then((r) => r.json())
          .then((j: Job) => {
            setActiveJob(j);
            setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)));
          })
          .catch(() => {});
      }
    };

    es.onerror = () => es.close();

    return () => { es.close(); esRef.current = null; };
  }, [activeJobId]);

  const addSite = () => {
    const url = siteInput.trim().replace(/\/$/, "");
    if (!url) return;
    if (!url.startsWith("http")) {
      setFormError("URL must start with http:// or https://");
      return;
    }
    setSites((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setSiteInput("");
    setFormError("");
  };

  const removeSite = (url: string) => setSites((prev) => prev.filter((s) => s !== url));

  const startCrawl = async () => {
    if (sites.length === 0) { setFormError("Add at least one site"); return; }
    setLaunching(true);
    setFormError("");
    try {
      const r = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites, max_products: maxProducts }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error ?? "failed to start job");
      }
      const j: Job = await r.json();
      setJobs((prev) => [j, ...prev]);
      setActiveJobId(j.id);
      setActiveJob(j);
      setSites([]);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Could not start job — is the crawler worker running?");
    } finally {
      setLaunching(false);
    }
  };

  const selectJob = (j: Job) => {
    setActiveJobId(j.id);
    setActiveJob(j);
    // Fetch full job (with products) from DB
    fetch(`${API}/jobs/${j.id}`)
      .then((r) => r.json())
      .then((full: Job) => setActiveJob(full))
      .catch(() => {});
  };

  const displayJob = activeJob;

  return (
    <div className="px-6 py-5 max-w-[1100px] space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">Crawl</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Add Shopify store URLs, set a product limit, and start crawling. Results stream in as they arrive.
        </p>
      </div>

      {/* Config panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Sites to crawl</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              placeholder="https://example.myshopify.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-300"
            />
            <button
              onClick={addSite}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Add
            </button>
          </div>
          {sites.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {sites.map((s) => (
                <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                  {s}
                  <button onClick={() => removeSite(s)} className="text-gray-400 hover:text-gray-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Max products</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={maxProducts}
              onChange={(e) => setMaxProducts(Number(e.target.value))}
              className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <button
            onClick={startCrawl}
            disabled={launching || sites.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {launching ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
                Run Crawl
              </>
            )}
          </button>
        </div>

        {formError && <p className="text-xs text-red-500">{formError}</p>}
      </div>

      {/* Active job */}
      {displayJob && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-800">
                Job <span className="font-mono text-gray-500">{displayJob.id}</span>
              </span>
              <StatusPill status={displayJob.status} />
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[320px]">
              {displayJob.sites?.join(", ")}
            </span>
          </div>

          <div className="px-5 py-4">
            <ProgressBar progress={displayJob.progress} />
          </div>

          {displayJob.products.length > 0 && (
            <div className="border-t border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Shop</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Price</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {displayJob.products.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-2.5 flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover bg-gray-100 shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 shrink-0" />
                        )}
                        <span className="text-xs text-gray-800 truncate max-w-[320px]">{p.name}</span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500">{p.shop}</td>
                      <td className="px-5 py-2.5 text-right text-xs tabular-nums text-gray-700">
                        {p.variants?.[0] ? `${p.variants[0].currency} ${p.variants[0].price}` : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-xs tabular-nums text-gray-400">
                        {p.variants?.length ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {displayJob.status === "done" && displayJob.products.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No products found.</div>
          )}
        </div>
      )}

      {/* Past jobs */}
      {jobs.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past jobs</span>
          </div>
          <div className="divide-y divide-gray-50">
            {jobs.slice(1).map((j) => (
              <button
                key={j.id}
                onClick={() => selectJob(j)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500">{j.id}</span>
                  <StatusPill status={j.status} />
                </div>
                <span className="text-xs text-gray-400">
                  {j.progress.scraped} products · {j.sites?.[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
