export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { generateTitle, generateDescription } from "@/lib/seo";
import { BrandsClient } from "./brands-client";

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
  banner_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  categories: string[];
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

      <BrandsClient brands={brands} />

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
