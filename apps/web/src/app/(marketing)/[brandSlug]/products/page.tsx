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
  website_url: string | null;
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
    title: `Products — ${brand.name}`,
    description: `Browse all products from ${brand.name}`,
  };
}

export default async function BrandProductsPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const [brand, products] = await Promise.all([getBrand(brandSlug), getProducts(brandSlug)]);

  if (!brand) notFound();

  return (
    <div className="px-4 py-12 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
        <Link href={`/${brandSlug}`} className="hover:text-gray-700">
          {brand.name}
        </Link>
        <span>/</span>
        <span className="text-gray-600">Products</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">All Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? "s" : ""} from {brand.name}
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">No products listed yet.</p>
          <Link href={`/${brandSlug}`} className="mt-3 inline-block text-xs text-blue-600 hover:underline">
            ← Back to {brand.name}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
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
      )}
    </div>
  );
}
