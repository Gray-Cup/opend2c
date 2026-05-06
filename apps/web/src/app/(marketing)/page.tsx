import Script from "next/script";
import ProductBrowser from "./product-browser";

type Product = {
  id: number;
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
};

async function fetchProducts(): Promise<Product[]> {
  const consoleUrl = (process.env.CONSOLE_URL ?? "http://localhost:3003").replace(/\/$/, "");
  try {
    const res = await fetch(`${consoleUrl}/api/public/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const products = await fetchProducts();

  return (
    <div>
      <Script
        id="org-ld-json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Open D2C",
            url: "https://graycup.org",
            description: "Global exporter of coffee, tea and spices.",
          }),
        }}
      />
      <div className="mx-auto px-4 lg:px-6 h-auto my-10">
        <div className="pt-10 pb-20 max-w-6xl mx-auto md:pb-10">
          <h1 className="text-black text-3xl sm:text-4xl lg:text-5xl font-medium sm:leading-[60px] mb-10">
            Open Free Marketplace
            <br />
            for <span>D2C</span>.
            <br />
            Companies.
          </h1>
          <ProductBrowser products={products} />
        </div>
      </div>
    </div>
  );
}
