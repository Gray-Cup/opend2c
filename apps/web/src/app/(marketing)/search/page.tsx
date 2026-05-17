import Link from "next/link";
import { Suspense } from "react";
import { withUTM } from "@/lib/utils";
import { SortSelect, type SortValue } from "./sort-select";

type Product = {
  id: number;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
};

const VALID_SORTS = new Set<SortValue>(["relevance", "price_asc", "price_desc", "newest"]);

function parseSort(raw: string | undefined): SortValue {
  if (raw && VALID_SORTS.has(raw as SortValue)) return raw as SortValue;
  return "relevance";
}

async function searchProducts(q: string, sort: SortValue): Promise<Product[]> {
  const consoleUrl = (process.env.CONSOLE_URL ?? "http://localhost:3003").replace(/\/$/, "");
  try {
    const params = new URLSearchParams({ q, sort });
    const res = await fetch(`${consoleUrl}/api/public/products?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q = "", sort: rawSort } = await searchParams;
  const trimmed = q.trim();
  const sort = parseSort(rawSort);
  const products = trimmed ? await searchProducts(trimmed, sort) : [];

  return (
    <div className="mx-auto px-4 lg:px-6 max-w-6xl py-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {trimmed ? (
              <>Results for &ldquo;{trimmed}&rdquo;</>
            ) : (
              "Search"
            )}
          </h1>
          {trimmed && (
            <p className="mt-1 text-sm text-neutral-400">
              {products.length === 0
                ? "No products found"
                : `${products.length} ${products.length === 1 ? "product" : "products"}`}
            </p>
          )}
        </div>

        {trimmed && products.length > 0 && (
          <Suspense>
            <SortSelect current={sort} />
          </Suspense>
        )}
      </div>

      {!trimmed ? (
        <p className="text-sm text-neutral-400">Enter a search term to find products.</p>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-neutral-500 font-medium">No results for &ldquo;{trimmed}&rdquo;</p>
          <p className="mt-1 text-sm text-neutral-400">Try a different product name or shop.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <a
              key={p.id}
              href={withUTM(p.source_url)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white hover:shadow-sm transition-all flex flex-col"
            >
              <div className="p-3 pb-0">
                <div className="relative h-52 w-full bg-neutral-100 rounded-lg overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-neutral-100" />
                  )}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-xs text-neutral-500 mb-2">{p.shop}</p>
                {p.price && (
                  <span className="text-sm font-semibold text-neutral-900 mt-auto">
                    {p.currency ? `${p.currency} ${p.price}` : p.price}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
