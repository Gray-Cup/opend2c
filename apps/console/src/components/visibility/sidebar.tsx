"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AccountTree,
  Add,
  Bookmark,
  Check,
  Close,
  Dashboard,
  Inventory2,
  Logout,
  ManageSearch,
  Settings,
} from "google-material-icons/outlined";
import { authClient } from "@/lib/auth-client";

type Brand = { id: number; name: string; slug: string };

type IconComponent = React.ComponentType<{
  className?: string;
  color?: string;
  size?: string | number;
}>;

type NavItem = { label: string; href: string; Icon: IconComponent };

function buildNav(slug: string): NavItem[] {
  return [
    { label: "Overview",       href: `/${slug}`,                 Icon: Dashboard    },
    { label: "Products",       href: `/${slug}/products`,        Icon: Inventory2   },
    { label: "URL Inspection", href: `/${slug}/url-inspection`,  Icon: ManageSearch },
    { label: "Sitemaps",       href: `/${slug}/sitemaps`,        Icon: AccountTree  },
    { label: "Brand",          href: `/${slug}/brand`,           Icon: Bookmark     },
  ];
}

function buildBottomNav(slug: string): NavItem[] {
  return [
    { label: "Settings", href: `/${slug}/settings`, Icon: Settings },
  ];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Sidebar({ brandSlug }: { brandSlug: string }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [brands, setBrands]           = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [open, setOpen]               = useState(false);
  const [signingOut, setSigningOut]   = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState("");
  const [createSlug, setCreateSlug]   = useState("");
  const [createWebsite, setCreateWebsite] = useState("");
  const [createSlugEdited, setCreateSlugEdited] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data: Brand[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setBrands(data);
        // Prefer the brand matching the current URL slug
        const current = data.find((b) => b.slug === brandSlug) ?? data[0];
        setActiveBrand(current);
      })
      .catch(() => {});
  }, [brandSlug]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectBrand(b: Brand) {
    setActiveBrand(b);
    setOpen(false);
    // Keep the user on the same section (e.g. /old-slug/products → /new-slug/products)
    const parts = pathname.split("/").filter(Boolean);
    const section = parts.length > 1 ? parts.slice(1).join("/") : "";
    router.push(section ? `/${b.slug}/${section}` : `/${b.slug}`);
  }

  function openCreateModal() {
    setOpen(false);
    setCreateName("");
    setCreateSlug("");
    setCreateWebsite("");
    setCreateSlugEdited(false);
    setCreateError("");
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName.trim(),
        slug: createSlug.trim(),
        description: "",
        website_url: createWebsite.trim() || null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setCreateError(b.error ?? "Could not create brand");
      return;
    }
    const brand: Brand = await res.json();
    setBrands((prev) => [...prev, brand]);
    setActiveBrand(brand);
    setShowCreate(false);
    router.push(`/${brand.slug}`);
  }

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
  }

  const navItems = buildNav(brandSlug);
  const isActive = (href: string) =>
    href === `/${brandSlug}` ? pathname === `/${brandSlug}` : pathname.startsWith(href);

  const bg = activeBrand
    ? `hsl(${(activeBrand.id * 47) % 360} 60% 90%)`
    : "#d1fae5";
  const fg = activeBrand
    ? `hsl(${(activeBrand.id * 47) % 360} 50% 35%)`
    : "#065f46";

  return (
    <>
      <aside className="w-64 shrink-0 bg-[#f0f4fa] flex flex-col overflow-y-auto">
        <div className="px-5 py-5 border-b border-black/5">
          <span className="text-lg font-semibold text-gray-900 tracking-tight">Open D2C</span>
        </div>

        {/* Brand switcher */}
        <div className="px-4 py-3.5 border-b border-black/5 relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: bg }}>
                <span className="text-[9px] font-bold" style={{ color: fg }}>
                  {activeBrand ? initials(activeBrand.name) : "?"}
                </span>
              </div>
              <span className="truncate font-medium text-gray-800">
                {activeBrand ? activeBrand.name : "Select brand"}
              </span>
            </div>
            <span className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          </button>

          {open && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-lg border border-black/5 py-1.5 z-50">
              {brands.map((b) => {
                const bbg = `hsl(${(b.id * 47) % 360} 60% 90%)`;
                const bfg = `hsl(${(b.id * 47) % 360} 50% 35%)`;
                return (
                  <button
                    key={b.id}
                    onClick={() => selectBrand(b)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: bbg }}>
                      <span className="text-[9px] font-bold" style={{ color: bfg }}>{initials(b.name)}</span>
                    </div>
                    <span className="flex-1 text-left text-gray-900 font-medium truncate">{b.name}</span>
                    {activeBrand?.id === b.id && (
                      <Check size={16} color="currentColor" className="text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}

              {brands.length > 0 && <div className="my-1 border-t border-black/5" />}

              <button
                onClick={openCreateModal}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Add size={16} color="currentColor" className="text-gray-400" />
                Add brand
              </button>

              <div className="my-1 border-t border-black/5" />

              <button
                onClick={signOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Logout size={16} color="currentColor" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-3">
          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-black/5 space-y-0.5">
          {buildBottomNav(brandSlug).map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} compact />
          ))}
        </div>
      </aside>

      {/* Create brand modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">New brand</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <Close size={18} color="currentColor" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Brand name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (!createSlugEdited) setCreateSlug(slugify(e.target.value));
                  }}
                  placeholder="My Store"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  URL slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createSlug}
                  onChange={(e) => { setCreateSlug(slugify(e.target.value)); setCreateSlugEdited(true); }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
                />
                <p className="mt-1 text-xs text-gray-400">opend2c.com/{createSlug || "your-brand"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Website</label>
                <input
                  type="text"
                  value={createWebsite}
                  onChange={(e) => setCreateWebsite(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
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

function SidebarLink({ item, active, compact = false }: { item: NavItem; active: boolean; compact?: boolean }) {
  const Icon = item.Icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-full font-medium transition-colors ${
        compact ? "px-2 py-1 text-base" : "px-4 py-2.5 text-base"
      } ${active ? "bg-[#c2e7ff] text-gray-900" : "text-gray-800 hover:bg-black/5 hover:text-gray-900"}`}
    >
      <Icon size={18} color="currentColor" className={active ? "text-gray-900" : "text-gray-500"} />
      {item.label}
    </Link>
  );
}
