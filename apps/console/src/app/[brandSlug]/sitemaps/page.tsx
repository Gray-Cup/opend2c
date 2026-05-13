"use client";

import { useEffect, useRef, useState } from "react";

type Sitemap = {
  id: number;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  product_count: number;
  progress_scraped: number;
  progress_total: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type ActiveProgress = {
  id: number;
  scraped: number;
  total: number;
  status: "running" | "done" | "failed";
  error?: string | null;
};

const STATUS_CONFIG: Record<Sitemap["status"], { label: string; className: string; dot: string }> = {
  queued:  { label: "Queued",  className: "text-gray-600 bg-gray-50 border-gray-200",         dot: "bg-gray-400" },
  running: { label: "Running", className: "text-blue-700 bg-blue-50 border-blue-200",          dot: "bg-blue-500 animate-pulse" },
  done:    { label: "Done",    className: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  failed:  { label: "Failed",  className: "text-red-600 bg-red-50 border-red-200",             dot: "bg-red-500" },
};

export default function SitemapsPage() {
  const [url, setUrl]           = useState("");
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState<ActiveProgress | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    const res = await fetch("/api/scraper/sitemaps", { cache: "no-store" });
    if (res.ok) setSitemaps(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openSSE(id: number) {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setProgress({ id, scraped: 0, total: 0, status: "running" });

    const es = new EventSource(`/api/scraper/sitemaps/${id}/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      let ev: { type: string; scraped?: number; total?: number; error?: string | null };
      try { ev = JSON.parse(e.data); } catch { return; }

      setProgress((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scraped: ev.scraped ?? prev.scraped,
          total:   ev.total   ?? prev.total,
          status:  ev.type === "done" ? "done" : ev.type === "failed" ? "failed" : "running",
          error:   ev.error ?? prev.error,
        };
      });

      if (ev.type === "done" || ev.type === "failed") {
        es.close();
        load();
      }
    };

    es.onerror = () => { es.close(); load(); };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const trimmed = url.trim();
    const duplicate = sitemaps.find((s) => s.url === trimmed);
    if (duplicate) {
      setFormError("This sitemap URL has already been added.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/scraper/sitemaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(body.error ?? "Could not add sitemap");
      return;
    }

    const { id } = await res.json();
    setUrl("");
    await load();
    openSSE(id);
  }

  async function handleDelete(id: number) {
    setMenuOpen(null);
    await fetch(`/api/scraper/sitemaps/${id}`, { method: "DELETE" });
    setSitemaps((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleResync(id: number) {
    setMenuOpen(null);
    const res = await fetch(`/api/scraper/sitemaps/${id}`, { method: "POST" });
    if (!res.ok) return;
    setSitemaps((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "running", progress_scraped: 0, progress_total: 0 } : s)
    );
    openSSE(id);
  }

  const pct = progress && progress.total > 0
    ? Math.round((progress.scraped / progress.total) * 100)
    : null;

  const successCount  = sitemaps.filter((s) => s.status === "done").length;
  const errorCount    = sitemaps.filter((s) => s.status === "failed").length;
  const totalProducts = sitemaps.reduce((sum, s) => sum + s.product_count, 0);

  return (
    <div className="px-10 py-8 max-w-[1000px]">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Sitemaps</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {loading
            ? "Loading…"
            : sitemaps.length === 0
            ? "No sitemaps added yet"
            : `${successCount} of ${sitemaps.length} sitemaps parsed successfully`}
        </p>
      </div>

      {/* Add sitemap form */}
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-md p-4 mb-5 space-y-3">
        <div className="flex gap-2">
          <input
            type="url"
            required
            placeholder="https://store.example.com/sitemap_products_1.xml"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setFormError(""); }}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-300"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Adding…" : "Add sitemap"}
          </button>
        </div>

        {formError && <p className="text-xs text-red-500">{formError}</p>}

        {progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                {progress.status === "running" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                {progress.status === "done"    && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {progress.status === "failed"  && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                {progress.status === "running" ? "Scraping…" : progress.status === "done" ? "Done" : "Failed"}
              </span>
              <span className="tabular-nums">
                {progress.scraped}{progress.total > 0 ? ` / ${progress.total}` : ""} products
                {pct !== null ? ` · ${pct}%` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress.status === "failed" ? "bg-red-400" : "bg-blue-500"}`}
                style={{ width: pct !== null ? `${pct}%` : progress.status === "running" ? "5%" : "100%" }}
              />
            </div>
            {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
          </div>
        )}
      </form>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Total Sitemaps</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{loading ? "—" : sitemaps.length || "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Products Found</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{loading ? "—" : totalProducts || "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Failed</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{loading ? "—" : errorCount || "—"}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading sitemaps…</div>
        ) : sitemaps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="h-7 w-7 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">No sitemaps yet</p>
            <p className="mt-1 text-xs text-gray-400">Add a sitemap URL above to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sitemap URL</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-32">Added</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">Products</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {sitemaps.map((sitemap) => {
                const config = STATUS_CONFIG[sitemap.status];
                const rowPct = sitemap.status === "running" && sitemap.progress_total > 0
                  ? Math.round((sitemap.progress_scraped / sitemap.progress_total) * 100)
                  : null;
                return (
                  <tr key={sitemap.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0">
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-mono text-gray-600">{sitemap.url}</span>
                      {sitemap.status === "running" && (
                        <div className="mt-1.5 h-1 w-48 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: rowPct !== null ? `${rowPct}%` : "8%" }}
                          />
                        </div>
                      )}
                      {sitemap.error && (
                        <p className="mt-1 text-[11px] text-red-500 truncate max-w-xs">{sitemap.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(sitemap.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right text-xs tabular-nums text-gray-700">
                      {sitemap.product_count > 0 ? sitemap.product_count : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative" ref={menuOpen === sitemap.id ? menuRef : null}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === sitemap.id ? null : sitemap.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Row actions"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="4"  r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>

                      {menuOpen === sitemap.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white border border-gray-200 rounded-md shadow-md py-1">
                          <button
                            onClick={() => handleResync(sitemap.id)}
                            disabled={sitemap.status === "running"}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Resync
                          </button>
                          <button
                            onClick={() => handleDelete(sitemap.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {errorCount > 0 && (
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-md">
          <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-700">
            <span className="font-medium">{errorCount} sitemap{errorCount > 1 ? "s have" : " has"} errors.</span>{" "}
            Check that the URL is accessible and returns valid XML.
          </p>
        </div>
      )}
    </div>
  );
}
