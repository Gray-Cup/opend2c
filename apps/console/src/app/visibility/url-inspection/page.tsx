"use client";

import { useState } from "react";
import { PRODUCTS } from "@/lib/visibility-data";
import { StatusBadge } from "@/components/visibility/status-badge";

type InspectionResult = {
  found: boolean;
  product?: (typeof PRODUCTS)[0];
};

function inspect(url: string): InspectionResult {
  const match = PRODUCTS.find(
    (p) =>
      p.url === url.trim() ||
      p.url === url.trim().replace(/^https?:\/\/[^/]+/, "") ||
      url.trim().endsWith(p.url)
  );
  if (match) return { found: true, product: match };
  return { found: false };
}

export default function URLInspectionPage() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [result, setResult] = useState<InspectionResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitted(input.trim());
    setResult(inspect(input.trim()));
  };

  const product = result?.product;

  return (
    <div className="px-10 py-8 max-w-[840px]">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">URL Inspection</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Inspect a product URL to see its indexing status and issues.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="https://your-store.com/products/example"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-800 placeholder-gray-300 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Inspect
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          Enter a full URL or path to inspect its indexing status.
        </p>
      </form>

      {/* Result */}
      {result !== null && (
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white border border-gray-200 rounded-md px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Inspection Result
                </p>
                <p className="text-xs font-mono text-gray-500 mb-3">{submitted}</p>
                {product ? (
                  <StatusBadge status={product.status} />
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border text-gray-500 bg-gray-50 border-gray-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    URL Not Found
                  </span>
                )}
              </div>
              {product && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Visibility Score</p>
                  <p className="text-2xl font-semibold text-gray-900">{product.visibilityScore}</p>
                </div>
              )}
            </div>
          </div>

          {product ? (
            <>
              {/* Crawl info */}
              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Crawl Information
                  </p>
                </div>
                <div className="px-5 divide-y divide-gray-50">
                  {[
                    { label: "Product", value: product.title },
                    { label: "URL", value: <span className="font-mono text-[11px]">{product.url}</span> },
                    { label: "Category", value: product.category },
                    { label: "Last Crawled", value: product.lastCrawled },
                    { label: "Clicks (28d)", value: product.clicks.toLocaleString() },
                    { label: "Impressions (28d)", value: product.impressions.toLocaleString() },
                    { label: "Avg. Position", value: product.position > 0 ? product.position.toFixed(1) : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs text-gray-900 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues */}
              {product.issues.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-red-50">
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">
                      Issues ({product.issues.length})
                    </p>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {product.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <svg className="h-4 w-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs text-gray-700">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              {product.status !== "indexed" && (
                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Request Indexing
                </button>
              )}

              {product.status === "indexed" && product.issues.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-md">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs text-emerald-700 font-medium">URL is indexed and has no issues.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-md px-5 py-8 text-center">
              <p className="text-sm text-gray-500">
                This URL was not found in your store's product catalog.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Make sure the path is correct or check your product catalog.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {result === null && (
        <div className="border border-dashed border-gray-200 rounded-md px-6 py-12 text-center bg-white">
          <svg className="h-8 w-8 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">Inspect any product URL</p>
          <p className="mt-1 text-xs text-gray-400">
            Enter a URL above to see its indexing status, crawl info, and any issues.
          </p>
        </div>
      )}
    </div>
  );
}
