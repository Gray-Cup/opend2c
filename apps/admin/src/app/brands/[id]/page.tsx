"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AdminBrand, AdminSitemap, AdminProduct } from "@/lib/store";

type Tab = "sitemaps" | "products" | "settings";

type ScrapeProgress = {
  id: number;
  scraped: number;
  total: number;
  status: "running" | "done" | "failed";
  error?: string | null;
};

const STATUS_DOT: Record<string, string> = {
  queued:  "bg-gray-400",
  running: "bg-blue-500 animate-pulse",
  done:    "bg-emerald-500",
  failed:  "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued", running: "Running", done: "Done", failed: "Failed",
};

function pct(s: number, t: number) {
  return t > 0 ? Math.round((s / t) * 100) : 0;
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({ brand }: { brand: AdminBrand | null }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 text-sm">
        <a href="/" className="text-gray-400 hover:text-gray-700 transition-colors">Admin</a>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">{brand?.name ?? "…"}</span>
        {brand && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-mono text-gray-400">{brand.slug}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {brand && (
          <>
            <span className="tabular-nums">{brand.product_count.toLocaleString()} products</span>
            <span className="text-gray-200">·</span>
            <span>{brand.owner_email}</span>
          </>
        )}
      </div>
    </header>
  );
}

// ─── Sitemaps tab ─────────────────────────────────────────────────────────────

function SitemapsTab({ brandId }: { brandId: number }) {
  const [sitemaps, setSitemaps]     = useState<AdminSitemap[]>([]);
  const [loading, setLoading]       = useState(true);
  const [url, setUrl]               = useState("");
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [progress, setProgress]     = useState<ScrapeProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);

  async function load() {
    const res = await fetch(`/api/brands/${brandId}/sitemaps`, { cache: "no-store" });
    if (res.ok) setSitemaps(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [brandId]);

  function openSSE(sitemapId: number) {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setProgress({ id: sitemapId, scraped: 0, total: 0, status: "running" });

    const es = new EventSource(`/api/brands/${brandId}/sitemaps/${sitemapId}/events`);
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
      if (ev.type === "done" || ev.type === "failed") { es.close(); load(); }
    };
    es.onerror = () => { es.close(); load(); };
  }

  async function addSitemap(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const trimmed = url.trim();
    if (sitemaps.find((s) => s.url === trimmed)) {
      setFormError("Already added.");
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/brands/${brandId}/sitemaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setFormError(b.error ?? "Could not add");
      return;
    }
    const { id: newId } = await res.json();
    setUrl("");
    await load();
    openSSE(newId);
  }

  async function deleteSitemap(id: number) {
    if (!confirm("Delete this sitemap and all its products?")) return;
    await fetch(`/api/brands/${brandId}/sitemaps/${id}`, { method: "DELETE" });
    setSitemaps((prev) => prev.filter((s) => s.id !== id));
  }

  async function resyncSitemap(id: number) {
    await fetch(`/api/brands/${brandId}/sitemaps/${id}`, { method: "POST" });
    setSitemaps((prev) => prev.map((s) => s.id === id ? { ...s, status: "running", progress_scraped: 0, progress_total: 0 } : s));
    openSSE(id);
  }

  const totalProducts = sitemaps.reduce((s, sm) => s + sm.product_count, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total sitemaps", value: sitemaps.length },
          { label: "Products found", value: totalProducts },
          { label: "Errors", value: sitemaps.filter((s) => s.status === "failed").length },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{c.label}</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <form onSubmit={addSitemap} className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => { setUrl(e.target.value); setFormError(""); }}
            placeholder="https://store.example.com/sitemap_products_1.xml"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {saving ? "Adding…" : "Add & scrape"}
          </button>
        </form>
        {formError && <p className="text-xs text-red-500">{formError}</p>}

        {progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[progress.status] ?? "bg-gray-400"}`} />
                {progress.status === "running" ? "Scraping…" : progress.status === "done" ? "Done" : "Failed"}
              </span>
              <span className="tabular-nums">
                {progress.scraped}{progress.total > 0 ? ` / ${progress.total}` : ""} products
                {progress.total > 0 ? ` · ${pct(progress.scraped, progress.total)}%` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress.status === "failed" ? "bg-red-400" : "bg-blue-500"}`}
                style={{ width: progress.total > 0 ? `${pct(progress.scraped, progress.total)}%` : progress.status === "running" ? "5%" : "100%" }}
              />
            </div>
            {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : sitemaps.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No sitemaps yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">URL</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24">Status</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24">Products</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">Added</th>
                <th className="px-3 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {sitemaps.map((sm) => (
                <tr key={sm.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono text-gray-600 break-all">{sm.url}</span>
                    {sm.status === "running" && sm.progress_total > 0 && (
                      <div className="mt-1.5 h-1 w-48 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${pct(sm.progress_scraped, sm.progress_total)}%` }}
                        />
                      </div>
                    )}
                    {sm.error && <p className="mt-1 text-[11px] text-red-500 truncate max-w-xs">{sm.error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[sm.status] ?? "bg-gray-300"}`} />
                      {STATUS_LABEL[sm.status] ?? sm.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-700">
                    {sm.product_count > 0 ? sm.product_count.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(sm.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => resyncSitemap(sm.id)}
                        disabled={sm.status === "running"}
                        className="px-2 py-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                      >
                        Resync
                      </button>
                      <button
                        onClick={() => deleteSitemap(sm.id)}
                        className="px-2 py-1 text-[11px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Products tab ─────────────────────────────────────────────────────────────

const PAGE = 50;

function ProductsTab({ brandId }: { brandId: number }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal]       = useState(0);
  const [hasMore, setHasMore]   = useState(false);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter]     = useState("all");
  const [issues, setIssues]     = useState(false);
  const [query, setQuery]       = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const queryRef    = useRef(debouncedQuery);
  const filterRef   = useRef(filter);
  const issuesRef   = useRef(issues);

  function onQueryChange(v: string) {
    setQuery(v);
    if (queryTimer.current) clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => setDebouncedQuery(v), 300);
  }

  const fetchPage = useCallback(async (off: number, q: string, f: string, iss: boolean, append: boolean) => {
    const params = new URLSearchParams({
      limit: String(PAGE), offset: String(off),
      status: iss ? "all" : f,
      ...(q ? { q } : {}),
      ...(iss ? { issues: "1" } : {}),
    });
    const res = await fetch(`/api/brands/${brandId}/products?${params}`, { cache: "no-store" });
    if (!res.ok) return;
    const data: { products: AdminProduct[]; total: number; hasMore: boolean } = await res.json();
    setProducts((prev) => append ? [...prev, ...data.products] : data.products);
    setTotal(data.total);
    setHasMore(data.hasMore);
    setOffset(off + data.products.length);
  }, [brandId]);

  useEffect(() => {
    queryRef.current  = debouncedQuery;
    filterRef.current = filter;
    issuesRef.current = issues;
    setLoading(true);
    fetchPage(0, debouncedQuery, filter, issues, false).finally(() => setLoading(false));
  }, [debouncedQuery, filter, issues, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root     = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
        fetchPage(offset, queryRef.current, filterRef.current, issuesRef.current, true)
          .finally(() => setLoadingMore(false));
      }
    }, { root, rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, fetchPage]);

  async function setStatus(id: number, status: string) {
    await fetch(`/api/brands/${brandId}/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-56 px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(["all", "active", "draft", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setIssues(false); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              filter === f && !issues
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setIssues((v) => !v)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            issues ? "bg-orange-500 text-white" : "bg-white border border-orange-300 text-orange-600 hover:bg-orange-50"
          }`}
        >
          Issues only
        </button>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {loading ? "…" : `${total.toLocaleString()} products`}
        </span>
      </div>

      <div ref={scrollRef} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : products.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No products found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Shop</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24">Price</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20">Status</th>
                  <th className="px-3 py-2.5 w-32" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 ${p.has_issue ? "bg-orange-50/30" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-8 w-8 rounded object-cover bg-gray-100 shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 shrink-0 flex items-center justify-center">
                            <span className="text-gray-300 text-[10px]">—</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                          >
                            {p.title}
                          </a>
                          {p.has_issue && (
                            <div className="flex gap-1 mt-0.5">
                              {!p.image && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">No image</span>}
                              {(!p.price || p.price.trim() === "") && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">No price</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{p.shop}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-700">
                      {p.price ? `${p.currency ?? ""} ${p.price}`.trim() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.status === "active"   ? "bg-emerald-100 text-emerald-700" :
                        p.status === "archived" ? "bg-gray-100 text-gray-400" :
                                                  "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={p.status}
                        onChange={(e) => setStatus(p.id, e.target.value)}
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:outline-none"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={sentinelRef} className="py-3 text-center">
              {loadingMore && <span className="text-xs text-gray-400">Loading more…</span>}
              {!hasMore && products.length > 0 && (
                <span className="text-xs text-gray-300">All {total.toLocaleString()} loaded</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({ brand }: { brand: AdminBrand }) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Transfer "${brand.name}" to ${email}? Current owner (${brand.owner_email}) will lose access.`)) return;
    setTransferring(true);
    setError("");
    const res = await fetch(`/api/brands/${brand.id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setTransferring(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Transfer failed");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Brand info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Brand info</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400 mb-0.5">ID</p>
            <p className="font-mono text-gray-700">{brand.id}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Slug</p>
            <p className="font-mono text-gray-700">{brand.slug}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Owner</p>
            <p className="text-gray-700">{brand.owner_email}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Created</p>
            <p className="text-gray-700">{new Date(brand.created_at).toLocaleDateString()}</p>
          </div>
          {brand.website_url && (
            <div className="col-span-2">
              <p className="text-gray-400 mb-0.5">Website</p>
              <a href={brand.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                {brand.website_url}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Transfer ownership */}
      <div className="bg-white border border-red-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Transfer ownership</h3>
        <p className="text-xs text-gray-500 mb-4">
          Move this brand to another registered account. The new owner gets full control immediately.
        </p>

        {done ? (
          <p className="text-sm text-emerald-600 font-medium">Transferred. Redirecting…</p>
        ) : (
          <form onSubmit={transfer} className="flex gap-2">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="new-owner@example.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="submit"
              disabled={transferring}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
            >
              {transferring ? "Transferring…" : "Transfer"}
            </button>
          </form>
        )}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const brandId = Number(id);
  const [brand, setBrand] = useState<AdminBrand | null>(null);
  const [tab, setTab]     = useState<Tab>("sitemaps");

  useEffect(() => {
    fetch(`/api/brands/${brandId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setBrand(d));
  }, [brandId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "sitemaps", label: "Sitemaps" },
    { id: "products", label: `Products${brand ? ` (${brand.product_count.toLocaleString()})` : ""}` },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Topbar brand={brand} />

      <div className="flex-1 flex flex-col px-6 py-5 max-w-7xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0">
          {tab === "sitemaps" && <SitemapsTab brandId={brandId} />}
          {tab === "products" && (
            <div className="h-[calc(100vh-200px)] flex flex-col">
              <ProductsTab brandId={brandId} />
            </div>
          )}
          {tab === "settings" && brand && <SettingsTab brand={brand} />}
        </div>
      </div>
    </div>
  );
}
