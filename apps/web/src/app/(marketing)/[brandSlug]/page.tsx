import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { withUTM } from "@/lib/utils";

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
};

type Product = {
  id: number;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
  source_url: string;
};

const CONSOLE_URL = (process.env.CONSOLE_URL ?? "http://localhost:3003").replace(/\/$/, "");

async function getBrand(slug: string): Promise<Brand | null> {
  try {
    const res = await fetch(`${CONSOLE_URL}/api/public/brands/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getProducts(slug: string): Promise<Product[]> {
  try {
    const res = await fetch(`${CONSOLE_URL}/api/public/brands/${slug}/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}): Promise<Metadata> {
  const { brandSlug } = await params;
  const brand = await getBrand(brandSlug);
  if (!brand) return {};
  return {
    title: brand.name,
    description: brand.description || `Browse products from ${brand.name}`,
  };
}

export default async function BrandProfilePage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const [brand, products] = await Promise.all([getBrand(brandSlug), getProducts(brandSlug)]);

  if (!brand) notFound();

  const featured = products.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      {brand.banner_url ? (
        <div className="w-full h-40 sm:h-52 bg-gray-100 overflow-hidden">
          <img src={brand.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-gray-100 to-gray-200" />
      )}

      {/* Header */}
      <div className="px-4 lg:px-6">
        <div className="flex items-end gap-4 -mt-8 mb-6">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-16 w-16 rounded-xl object-cover bg-white border-2 border-white shadow-sm shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-emerald-700">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">{brand.name}</h1>
          {brand.description && (
            <p className="mt-1.5 text-sm text-gray-500 max-w-xl">{brand.description}</p>
          )}
          {brand.categories?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brand.categories.map((cat) => (
                <span key={cat} className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {cat}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {brand.website_url && (
              <a href={brand.website_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {brand.website_url.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
            {brand.twitter_url && (
              <a href={brand.twitter_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter / X
              </a>
            )}
            {brand.instagram_url && (
              <a href={brand.instagram_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-600 transition-colors">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
            )}
            <Link href={`/${brandSlug}/products`}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 ml-auto">
              View all products →
            </Link>
          </div>
        </div>
      </div>

      {/* Featured products */}
      {featured.length > 0 ? (
        <div className="px-4 lg:px-6 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Products</h2>
            {products.length > 6 && (
              <Link
                href={`/${brandSlug}/products`}
                className="text-xs text-blue-600 hover:underline"
              >
                See all {products.length} →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featured.map((product) => (
              <a
                key={product.id}
                href={withUTM(product.source_url)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white hover:shadow-sm transition-all flex flex-col"
              >
                <div className="p-3 pb-0">
                  <div className="relative h-52 w-full bg-neutral-100 rounded-lg overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-neutral-100" />
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-2">{product.title}</h3>
                  <p className="text-xs text-neutral-500 mb-2">{product.shop}</p>
                  {product.price && (
                    <span className="text-sm font-semibold text-neutral-900 mt-auto">
                      {product.currency ? `${product.currency} ${product.price}` : product.price}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 lg:px-6 pb-12 py-16 text-center">
          <p className="text-sm text-gray-400">No products listed yet.</p>
        </div>
      )}
    </div>
  );
}
