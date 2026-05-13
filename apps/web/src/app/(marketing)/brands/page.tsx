export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { generateTitle, generateDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: generateTitle("D2C Brands"),
  description: generateDescription(
    "Browse all direct-to-consumer brands listed on Open D2C — India's open marketplace for D2C companies.",
  ),
};

type Brand = {
  id: number;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  website_url: string | null;
  product_count: number;
};

async function fetchBrands(): Promise<Brand[]> {
  const consoleUrl = (process.env.CONSOLE_URL ?? "http://localhost:3003").replace(/\/$/, "");
  try {
    const res = await fetch(`${consoleUrl}/api/public/brands`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

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

export default async function BrandsPage() {
  const brands = await fetchBrands();

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-neutral-900">D2C Brands</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {brands.length > 0
            ? `${brands.length} brand${brands.length !== 1 ? "s" : ""} listed on Open D2C`
            : "Brands will appear here once they're listed on the platform."}
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-8 py-16 text-center">
          <p className="text-sm text-neutral-500">No brands listed yet.</p>
          <a
            href="https://console.opend2c.com"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            List your brand →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
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

      <div className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-neutral-900">Are you a D2C brand?</p>
          <p className="text-xs text-neutral-500 mt-0.5">List your products for free and get discovered by customers.</p>
        </div>
        <a
          href="https://console.opend2c.com"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Get listed →
        </a>
      </div>
    </div>
  );
}
