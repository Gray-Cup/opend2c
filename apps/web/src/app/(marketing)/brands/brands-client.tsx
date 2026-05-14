"use client";

import { useState } from "react";
import Link from "next/link";

type Brand = {
  id: number;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  categories: string[];
  product_count: number;
};

function BrandInitial({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {initials}
    </div>
  );
}

export function BrandsClient({ brands }: { brands: Brand[] }) {
  const [active, setActive] = useState<string | null>(null);

  const allCategories = Array.from(
    new Set(brands.flatMap((b) => b.categories ?? [])),
  ).sort();

  const filtered = active
    ? brands.filter((b) => b.categories?.includes(active))
    : brands;

  if (brands.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-8 py-16 text-center">
        <p className="text-sm text-neutral-500">No brands listed yet.</p>
        <a
          href="https://console.opend2c.com"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          List your brand →
        </a>
      </div>
    );
  }

  return (
    <>
      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7">
          <button
            onClick={() => setActive(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              active === null
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(active === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active === cat
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 py-8 text-center">
          No brands in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((brand) => (
            <Link
              key={brand.id}
              href={`/${brand.slug}`}
              className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-12 w-12 rounded-xl object-contain bg-neutral-50 border border-neutral-100 shrink-0"
                />
              ) : (
                <BrandInitial name={brand.name} />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                  {brand.name}
                </p>
                {brand.description ? (
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">
                    {brand.description}
                  </p>
                ) : null}
                {brand.categories?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {brand.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-neutral-400">
                  {brand.product_count > 0
                    ? `${brand.product_count} product${brand.product_count !== 1 ? "s" : ""}`
                    : "No products yet"}
                </p>
              </div>

              <svg
                className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0 mt-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
