"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ProductStatus = "draft" | "active" | "archived";
type FilterValue   = ProductStatus | "all";

type Product = {
  id: number;
  sitemap_id: number;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
  status: ProductStatus;
  notes: string;
  click_count: number;
  updated_at: string;
};

const PAGE = 10;
const FILTERS: FilterValue[] = ["all", "draft", "active", "archived"];

function truncateWords(text: string, n: number) {
  const words = text.split(/\s+/);
  return words.length <= n ? text : words.slice(0, n).join(" ") + "…";
}

type Issue = "no_image" | "no_price" | "broken_image";

function getIssues(p: Product, brokenIds: Set<number>): Issue[] {
  const issues: Issue[] = [];
  if (!p.image) issues.push("no_image");
  else if (brokenIds.has(p.id)) issues.push("broken_image");
  if (!p.price || p.price.trim() === "") issues.push("no_price");
  return issues;
}

const ISSUE_LABELS: Record<Issue, { label: string; color: string }> = {
  no_image:     { label: "No image",     color: "bg-amber-100 text-amber-700" },
  broken_image: { label: "Broken image", color: "bg-red-100 text-red-600"     },
  no_price:     { label: "No price",     color: "bg-orange-100 text-orange-700" },
};

function ImageThumb({ product, broken, onBroken }: {
  product: Product;
  broken: boolean;
  onBroken: (id: number) => void;
}) {
  if (!product.image) {
    return <div className="h-10 w-10 rounded-md bg-gray-100 shrink-0 flex items-center justify-center">
      <span className="text-gray-300 text-xs">—</span>
    </div>;
  }
  return (
    <div className="relative h-10 w-10 shrink-0">
      <img
        src={product.image}
        alt=""
        className={`h-10 w-10 rounded-md object-cover bg-gray-100 ${broken ? "opacity-30" : ""}`}
        onError={() => onBroken(product.id)}
      />
      {broken && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-red-500 text-base leading-none" title="Image failed to load">⚠</span>
        </div>
      )}
    </div>
  );
}

function ImageEditor({ product, broken, onSaved, onDeleted }: {
  product: Product;
  broken: boolean;
  onSaved: (p: Product) => void;
  onDeleted: (id: number) => void;
}) {
  const [imageUrl, setImageUrl]   = useState(product.image ?? "");
  const [previewBroken, setPreviewBroken] = useState(broken);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState("");

  // Reset when product changes
  useEffect(() => {
    setImageUrl(product.image ?? "");
    setPreviewBroken(broken);
    setError("");
  }, [product.id, product.image, broken]);

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/scraper/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, image: imageUrl || null }),
    });
    setSaving(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error ?? "Could not save"); return; }
    onSaved(await res.json());
  }

  async function del() {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch("/api/scraper/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [product.id] }),
    });
    setDeleting(false);
    if (!res.ok) { setError("Could not delete"); return; }
    onDeleted(product.id);
  }

  const showPreview = imageUrl && !previewBroken;

  return (
    <div className="space-y-3">
      {broken && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5">
          <span className="text-red-500 text-sm mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-700">Image failed to load</p>
            <p className="text-xs text-red-500 mt-0.5">Update the URL below or clear it to remove the image.</p>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-md overflow-hidden bg-gray-100 h-36 flex items-center justify-center">
        {imageUrl ? (
          showPreview ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-2xl">⚠</span>
              <span className="text-xs">Image not previewable</span>
            </div>
          )
        ) : (
          <span className="text-xs text-gray-400">No image</span>
        )}
      </div>

      {/* URL input */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Image URL</label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => { setImageUrl(e.target.value); setPreviewBroken(false); }}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={del}
          disabled={deleting}
          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete product"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update image"}
        </button>
      </div>
    </div>
  );
}

function checkImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const timer = setTimeout(() => { resolve(false); }, 8000);
    img.onload  = () => { clearTimeout(timer); resolve(true);  };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [total, setTotal]             = useState(0);
  const [hasMore, setHasMore]         = useState(false);
  const [offset, setOffset]           = useState(0);
  const [selected, setSelected]       = useState<Product | null>(null);
  const [checked, setChecked]         = useState<Set<number>>(new Set());
  const [brokenIds, setBrokenIds]     = useState<Set<number>>(new Set());
  const [scanning, setScanning]       = useState(false);
  const [scanProgress, setScanProgress] = useState({ checked: 0, total: 0 });
  const [query, setQuery]             = useState("");
  const [filter, setFilter]           = useState<FilterValue>("all");
  const [showBroken, setShowBroken]   = useState(false);
  const [showIssues, setShowIssues]   = useState(false);
  const [editTab, setEditTab]         = useState<"details" | "image">("details");
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [bulking, setBulking]         = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState("");

  const searchParams   = useSearchParams();
  const sentinelRef    = useRef<HTMLDivElement>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const queryRef       = useRef(query);
  const filterRef      = useRef(filter);
  const showIssuesRef  = useRef(showIssues);

  const markBroken = useCallback((id: number) => {
    setBrokenIds((prev) => prev.has(id) ? prev : new Set([...prev, id]));
  }, []);

  async function scanAllImages() {
    if (scanning) return;
    setScanning(true);
    setBrokenIds(new Set());
    setScanProgress({ checked: 0, total: 0 });

    // Fetch all products across all pages
    const withImages: { id: number; image: string }[] = [];
    let off = 0;
    while (true) {
      const res = await fetch(`/api/scraper/products?limit=100&offset=${off}&status=all`, { cache: "no-store" });
      if (!res.ok) break;
      const data: { products: Product[]; hasMore: boolean } = await res.json();
      for (const p of data.products) {
        if (p.image) withImages.push({ id: p.id, image: p.image });
      }
      off += data.products.length;
      if (!data.hasMore) break;
    }

    setScanProgress({ checked: 0, total: withImages.length });

    // Check each image, updating progress and broken set incrementally
    await Promise.all(
      withImages.map(async ({ id, image }) => {
        const ok = await checkImageUrl(image);
        setScanProgress((p) => ({ ...p, checked: p.checked + 1 }));
        if (!ok) setBrokenIds((prev) => new Set([...prev, id]));
      }),
    );

    setScanning(false);
    setShowBroken(true);
  }

  const fetchPage = useCallback(async (
    off: number, q: string, f: FilterValue, issues: boolean, append: boolean,
  ) => {
    const params = new URLSearchParams({
      limit:  String(PAGE),
      offset: String(off),
      status: issues ? "all" : f,
      ...(q ? { q } : {}),
      ...(issues ? { has_issues: "1" } : {}),
    });
    const res = await fetch(`/api/scraper/products?${params}`, { cache: "no-store" });
    if (!res.ok) { setError("Could not load products"); return; }
    const data: { products: Product[]; total: number; hasMore: boolean } = await res.json();
    setProducts((prev) => append ? [...prev, ...data.products] : data.products);
    setTotal(data.total);
    setHasMore(data.hasMore);
    setOffset(off + data.products.length);
    if (!append) {
      setSelected((cur) => data.products.find((p) => p.id === cur?.id) ?? null);
    }
  }, []);

  // Read ?issues=1 from URL on first mount
  useEffect(() => {
    if (searchParams.get("issues") === "1") {
      setShowIssues(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    queryRef.current      = query;
    filterRef.current     = filter;
    showIssuesRef.current = showIssues;
    setLoading(true);
    setChecked(new Set());
    fetchPage(0, query, filter, showIssues, false).finally(() => setLoading(false));
  }, [query, filter, showIssues, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root     = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchPage(offset, queryRef.current, filterRef.current, showIssuesRef.current, true)
            .finally(() => setLoadingMore(false));
        }
      },
      { root, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, fetchPage]);

  async function selectAllIssues() {
    // Load every page of issues then select all IDs
    const allIds: number[] = [];
    let off = 0;
    while (true) {
      const params = new URLSearchParams({ limit: "100", offset: String(off), status: "all", has_issues: "1" });
      const res = await fetch(`/api/scraper/products?${params}`, { cache: "no-store" });
      if (!res.ok) break;
      const data: { products: Product[]; hasMore: boolean } = await res.json();
      // Merge any newly loaded products into state
      setProducts((prev) => {
        const known = new Map(prev.map((p) => [p.id, p]));
        data.products.forEach((p) => known.set(p.id, p));
        return [...known.values()];
      });
      for (const p of data.products) allIds.push(p.id);
      off += data.products.length;
      if (!data.hasMore) break;
    }
    setChecked(new Set(allIds));
  }

  const queryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onQueryChange(v: string) {
    if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    queryTimerRef.current = setTimeout(() => setQuery(v), 300);
  }

  // In issues mode the server already filters; in broken mode filter client-side from loaded products
  const visibleProducts = showBroken && !showIssues
    ? products.filter((p) => brokenIds.has(p.id))
    : products;

  const allPageChecked = visibleProducts.length > 0 && visibleProducts.every((p) => checked.has(p.id));
  const someChecked    = checked.size > 0;

  function toggleAll() {
    setChecked((prev) => {
      const next = new Set(prev);
      allPageChecked
        ? visibleProducts.forEach((p) => next.delete(p.id))
        : visibleProducts.forEach((p) => next.add(p.id));
      return next;
    });
  }

  function toggleOne(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkUpdate(status: ProductStatus) {
    const ids = [...checked];
    if (!ids.length) return;
    setBulking(true);
    const res = await fetch("/api/scraper/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    setBulking(false);
    if (!res.ok) { setError("Bulk update failed"); return; }
    setChecked(new Set());
    setLoading(true);
    await fetchPage(0, query, filter, showIssues, false);
    setLoading(false);
  }

  async function bulkDelete() {
    const ids = [...checked];
    if (!window.confirm(`Delete ${ids.length} product${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch("/api/scraper/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setDeleting(false);
    if (!res.ok) { setError("Delete failed"); return; }
    if (selected && checked.has(selected.id)) setSelected(null);
    setChecked(new Set());
    setLoading(true);
    await fetchPage(0, query, filter, showIssues, false);
    setLoading(false);
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    const res = await fetch("/api/scraper/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        title:    form.get("title"),
        price:    form.get("price"),
        currency: form.get("currency"),
        status:   form.get("status"),
        notes:    form.get("notes"),
      }),
    });
    setSaving(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error ?? "Could not update"); return; }
    const updated: Product = await res.json();
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  }

  function handleImageSaved(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
    // If image was fixed, remove from broken set
    if (updated.image) {
      setBrokenIds((prev) => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
    }
  }

  function handleDeleted(id: number) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
    setBrokenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setTotal((t) => t - 1);
  }

  return (
    <div className="px-8 py-6 h-full flex gap-5 overflow-hidden">
      <section className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? "Loading…" : `${total} product${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <input
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search products"
            className="w-72 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setShowBroken(false); setShowIssues(false); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                  filter === f && !showBroken && !showIssues ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => { setShowIssues((v) => !v); setShowBroken(false); setChecked(new Set()); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${
                showIssues
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-orange-300 text-orange-600 hover:bg-orange-50"
              }`}
            >
              Issues
              {showIssues && total > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-white/20 text-white">
                  {total}
                </span>
              )}
            </button>

            <button
              onClick={scanning ? undefined : showBroken ? () => setShowBroken(false) : scanAllImages}
              disabled={scanning}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:cursor-wait ${
                showBroken
                  ? "bg-red-600 text-white"
                  : scanning
                    ? "bg-white border border-gray-200 text-gray-500"
                    : brokenIds.size > 0
                      ? "bg-white border border-red-300 text-red-600 hover:bg-red-50"
                      : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {scanning ? (
                <>
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {scanProgress.total > 0
                    ? `${scanProgress.checked}/${scanProgress.total}`
                    : "Fetching…"}
                </>
              ) : (
                <>
                  <span>⚠</span>
                  {showBroken ? "Hide broken" : "Scan images"}
                  {brokenIds.size > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      showBroken ? "bg-white/20 text-white" : "bg-red-100 text-red-600"
                    }`}>
                      {brokenIds.size}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {showIssues ? (
            <div className="flex items-center gap-2">
              {someChecked ? (
                <>
                  <span className="text-xs text-gray-500">{checked.size} selected</span>
                  <button onClick={bulkDelete} disabled={deleting}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {deleting ? "Deleting…" : `Delete ${checked.size}`}
                  </button>
                  <button onClick={() => setChecked(new Set())} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600">
                    Clear
                  </button>
                </>
              ) : (
                !loading && total > 0 && (
                  <button
                    onClick={selectAllIssues}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50"
                  >
                    Select all {total} with issues
                  </button>
                )
              )}
            </div>
          ) : someChecked ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{checked.size} selected</span>
              <button onClick={() => bulkUpdate("active")} disabled={bulking}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {bulking ? "Updating…" : "Make active"}
              </button>
              <button onClick={() => bulkUpdate("draft")} disabled={bulking}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">
                Set draft
              </button>
              <button onClick={() => bulkUpdate("archived")} disabled={bulking}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">
                Archive
              </button>
              <button onClick={bulkDelete} disabled={deleting}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setChecked(new Set())} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600">
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {showBroken && brokenIds.size === 0 && !scanning && (
          <div className="mb-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-700">
            All images loaded successfully — no broken URLs found.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0">
          <div ref={scrollRef} className="h-full overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Loading products…</div>
            ) : visibleProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                {showIssues ? "No issues found — all products have images and prices." : showBroken ? "No broken images detected in loaded products." : "No products found. Add a sitemap in Sitemaps first."}
              </div>
            ) : (
              <>
                <table className="w-full min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="pl-4 pr-2 py-3 w-8">
                        <input type="checkbox" checked={allPageChecked} onChange={toggleAll}
                          className="rounded border-gray-300 text-gray-900 focus:ring-0" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Shop</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => {
                      const isBroken = brokenIds.has(product.id);
                      const issues   = getIssues(product, brokenIds);
                      return (
                        <tr
                          key={product.id}
                          className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                            selected?.id === product.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <td className="pl-4 pr-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checked.has(product.id)} onChange={() => toggleOne(product.id)}
                              className="rounded border-gray-300 text-gray-900 focus:ring-0" />
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => { setSelected(product); setEditTab(isBroken ? "image" : "details"); }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <ImageThumb product={product} broken={isBroken} onBroken={markBroken} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{truncateWords(product.title, 6)}</p>
                                <p className="text-xs text-gray-400 truncate">{product.source_url}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 cursor-pointer" onClick={() => setSelected(product)}>{product.shop}</td>
                          <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-700 cursor-pointer" onClick={() => setSelected(product)}>
                            {product.price ? `${product.currency ?? ""} ${product.price}`.trim() : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-500 cursor-pointer" onClick={() => setSelected(product)}>
                            {product.click_count > 0 ? product.click_count.toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(product)}>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                              product.status === "active"   ? "bg-emerald-100 text-emerald-700" :
                              product.status === "archived" ? "bg-gray-100 text-gray-400"       :
                                                              "bg-gray-100 text-gray-600"
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(product)}>
                            <div className="flex flex-wrap gap-1">
                              {issues.map((issue) => (
                                <span key={issue} className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${ISSUE_LABELS[issue].color}`}>
                                  {ISSUE_LABELS[issue].label}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div ref={sentinelRef} className="py-3 text-center">
                  {loadingMore && <span className="text-xs text-gray-400">Loading more…</span>}
                  {!hasMore && products.length > 0 && (
                    <span className="text-xs text-gray-300">All {total} products loaded</span>
                  )}
                </div>
              </>
            )}
            {error && <p className="px-5 py-2 text-xs text-red-500">{error}</p>}
          </div>
        </div>
      </section>

      {/* Edit panel */}
      <aside className="w-[380px] shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        {selected ? (
          <>
            {/* Panel header with tabs */}
            <div className="px-5 pt-4 pb-0 border-b border-gray-100 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">{truncateWords(selected.title, 6)}</h2>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">{selected.source_url}</p>
                  {(() => {
                    const issues = getIssues(selected, brokenIds);
                    return issues.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {issues.map((issue) => (
                          <span key={issue} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ISSUE_LABELS[issue].color}`}>
                            {ISSUE_LABELS[issue].label}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2 mt-0.5 text-lg leading-none">×</button>
              </div>
              <div className="flex gap-4">
                {(["details", "image"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditTab(t)}
                    className={`pb-2.5 text-xs font-medium capitalize border-b-2 transition-colors flex items-center gap-1.5 ${
                      editTab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {t === "image" && brokenIds.has(selected.id) && (
                      <span className="text-red-500 text-xs">⚠</span>
                    )}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {editTab === "details" ? (
                <form key={selected.id} onSubmit={saveProduct} className="flex flex-col h-full">
                  <div className="p-5 space-y-4 flex-1">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700">Title</span>
                      <input name="title" defaultValue={selected.title} required
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Price</span>
                        <input name="price" defaultValue={selected.price ?? ""}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Currency</span>
                        <input name="currency" defaultValue={selected.currency ?? ""}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700">Status</span>
                      <select name="status" defaultValue={selected.status}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700">Notes</span>
                      <textarea name="notes" defaultValue={selected.notes} rows={4}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400" />
                    </label>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
                    <button type="submit" disabled={saving}
                      className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50">
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5">
                  <ImageEditor
                    key={selected.id}
                    product={selected}
                    broken={brokenIds.has(selected.id)}
                    onSaved={handleImageSaved}
                    onDeleted={handleDeleted}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center px-8 text-center text-sm text-gray-400">
            Select a product to edit, or use checkboxes to bulk update status.
          </div>
        )}
      </aside>
    </div>
  );
}
