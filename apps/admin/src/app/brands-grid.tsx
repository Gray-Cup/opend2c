"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminBrand } from "@/lib/store";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function BrandInitial({ name, logo }: { name: string; logo: string | null }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className="h-10 w-10 rounded-lg object-cover bg-gray-100"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
      <span className="text-white text-sm font-bold">{name[0]?.toUpperCase() ?? "B"}</span>
    </div>
  );
}

export default function BrandsGrid({ initialBrands }: { initialBrands: AdminBrand[] }) {
  const router = useRouter();
  const [brands, setBrands]     = useState(initialBrands);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ name: "", owner_email: "", website_url: "" });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch]     = useState("");

  const filtered = brands.filter((b) =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase()) ||
    (b.owner_email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        slug: slugify(form.name),
        owner_email: form.owner_email.trim(),
        website_url: form.website_url.trim() || null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setFormError(b.error ?? "Could not create brand");
      return;
    }
    const brand = await res.json();
    setBrands((prev) => [brand, ...prev]);
    setShowCreate(false);
    setForm({ name: "", owner_email: "", website_url: "" });
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Brands</h1>
          <p className="text-xs text-gray-500 mt-0.5">{brands.length} brand{brands.length !== 1 ? "s" : ""} on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search brands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> New brand
          </button>
        </div>
      </div>

      {/* Brand cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">
          {search ? "No brands match your search." : "No brands yet — create the first one."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              onClick={() => router.push(`/brands/${brand.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <BrandInitial name={brand.name} logo={brand.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {brand.name}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{brand.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2.5">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 tabular-nums">{brand.product_count.toLocaleString()}</span>
                  {" "}products
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 tabular-nums">{brand.sitemap_count}</span>
                  {" "}sitemaps
                </span>
              </div>

              {brand.owner_email && (
                <p className="text-[10px] text-gray-400 truncate">{brand.owner_email}</p>
              )}

              {brand.website_url && (
                <p className="text-[10px] text-blue-500 truncate mt-0.5">
                  {brand.website_url.replace(/^https?:\/\//, "")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create brand modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Create brand</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={createBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Brand name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nourish Organics"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.name && (
                  <p className="text-[11px] text-gray-400 mt-1 font-mono">slug: {slugify(form.name)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner email * <span className="text-gray-400 font-normal">(must have an account)</span></label>
                <input
                  required
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                  placeholder="brand@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Website URL</label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://brand.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError(""); }}
                  className="flex-1 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
