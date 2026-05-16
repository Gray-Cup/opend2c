type ScrapedProduct = {
  source_url: string;
  title: string;
  image: string | null;
  shop: string;
  price: string | null;
  currency: string | null;
};

type Offer = {
  price?: string | number;
  priceCurrency?: string;
  url?: string;
};

const MAX_PRODUCTS_PER_SITEMAP = 200;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3;

export async function scrapeProductsFromSitemap(
  sitemapUrl: string,
  onProgress?: (scraped: number, total: number) => void,
) {
  const sitemap = await fetchText(sitemapUrl);
  const urls = extractLocs(sitemap)
    .filter((url) => /product|\/p\//i.test(url))
    .slice(0, MAX_PRODUCTS_PER_SITEMAP);

  const total = urls.length;
  const products: ScrapedProduct[] = [];
  const retryQueue: string[] = [];

  for (const url of urls) {
    const result = await scrapeProductWithRetry(url);
    if (result === "rate-limited") retryQueue.push(url);
    else if (result) products.push(result);
    onProgress?.(products.length, total);
  }

  if (retryQueue.length > 0) {
    await sleep(RETRY_DELAY_MS * 2);
    for (const url of retryQueue) {
      const result = await scrapeProductWithRetry(url);
      if (result && result !== "rate-limited") products.push(result);
      onProgress?.(products.length, total);
    }
  }

  return products;
}

async function scrapeProductWithRetry(url: string): Promise<ScrapedProduct | null | "rate-limited"> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const html = await fetchText(url);
      return parseProduct(url, html);
    } catch (err) {
      if (err instanceof RateLimitError) {
        if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY_MS * (attempt + 1)); continue; }
        return "rate-limited";
      }
      return null;
    }
  }
  return null;
}

function parseProduct(url: string, html: string): ScrapedProduct | null {
  const raw = findProductJson(html);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const title = typeof parsed.name === "string" ? parsed.name : "";
  if (!title) return null;
  const offer = pickOffer(parsed.offers);
  const sourceUrl = offer?.url ? resolveUrl(url, offer.url) : url;
  return {
    source_url: sourceUrl,
    title,
    image: pickImage(parsed.image),
    shop: new URL(url).hostname.replace(/^www\./, ""),
    price: offer?.price === undefined ? null : String(offer.price),
    currency: offer?.priceCurrency ?? null,
  };
}

class RateLimitError extends Error {}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OpenD2CAdminBot/1.0; +https://opend2c.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (res.status === 429 || res.status === 503) throw new RateLimitError(`Rate limited (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function extractLocs(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => decodeXml(m[1].trim()));
}

function findProductJson(html: string) {
  for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const found = findProductInJson(script[1].trim());
    if (found) return JSON.stringify(found);
  }
  return null;
}

function findProductInJson(raw: string): unknown {
  try { return walkJson(JSON.parse(raw)); } catch { return null; }
}

function walkJson(value: unknown): unknown {
  if (Array.isArray(value)) { for (const item of value) { const f = walkJson(item); if (f) return f; } return null; }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
  if (types.includes("Product") || types.includes("ProductGroup")) return obj;
  if (obj["@graph"]) return walkJson(obj["@graph"]);
  return null;
}

function pickOffer(value: unknown): Offer | null {
  if (Array.isArray(value)) return pickOffer(value[0]);
  if (!value || typeof value !== "object") return null;
  const offer = value as Offer & { offers?: unknown };
  if (offer.offers) return pickOffer(offer.offers);
  return offer;
}

function pickImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return pickImage(value[0]);
  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

function resolveUrl(base: string, next: string) {
  try { return new URL(next, base).toString(); } catch { return base; }
}

function decodeXml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"").replaceAll("&apos;", "'");
}
