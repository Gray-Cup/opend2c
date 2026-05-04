export type ProductStatus = "indexed" | "not_indexed" | "error";

export type Product = {
  id: string;
  title: string;
  url: string;
  status: ProductStatus;
  lastCrawled: string;
  visibilityScore: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issues: string[];
  category: string;
  price: string;
};

export type PerformancePoint = {
  date: string;
  impressions: number;
  clicks: number;
};

export type Query = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type Sitemap = {
  url: string;
  status: "success" | "error" | "pending";
  lastRead: string;
  discoveredUrls: number;
  indexedUrls: number;
};

export const PRODUCTS: Product[] = [];

export const PERFORMANCE_DATA: PerformancePoint[] = [];

export const TOP_QUERIES: Query[] = [];

export const SITEMAPS: Sitemap[] = [];

export const OVERVIEW_METRICS = {
  impressions:     { value: "—", change: "", up: null as boolean | null },
  clicks:          { value: "—", change: "", up: null as boolean | null },
  indexedProducts: { value: "—", change: "", up: null as boolean | null },
  ctr:             { value: "—", change: "", up: null as boolean | null },
  avgPosition:     { value: "—", change: "", up: null as boolean | null },
};
