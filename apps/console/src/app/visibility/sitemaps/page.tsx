"use client";

import { useState } from "react";
import type { Sitemap } from "@/lib/visibility-data";

const STATUS_CONFIG = {
  success: {
    label: "Success",
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  error: {
    label: "Error",
    className: "text-red-600 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    className: "text-amber-600 bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
};

export default function SitemapsPage() {
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const handleSubmit = () => {
    const url = newUrl.trim();
    if (!url) { setUrlError("Enter a sitemap URL"); return; }
    if (!url.startsWith("http")) { setUrlError("URL must start with http:// or https://"); return; }
    if (sitemaps.some((s) => s.url === url)) { setUrlError("This sitemap is already added"); return; }

    setSitemaps((prev) => [
      ...prev,
      {
        url,
        status: "pending",
        lastRead: new Date().toISOString().slice(0, 10),
        discoveredUrls: 0,
        indexedUrls: 0,
      },
    ]);
    setNewUrl("");
    setUrlError("");
    setShowAdd(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setShowAdd(false); setUrlError(""); }
  };

  const successCount = sitemaps.filter((s) => s.status === "success").length;
  const errorCount   = sitemaps.filter((s) => s.status === "error").length;

  return (
    <div className="px-10 py-8 max-w-[1000px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sitemaps</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {sitemaps.length === 0
              ? "No sitemaps added yet"
              : `${successCount} of ${sitemaps.length} sitemaps parsed successfully`}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setUrlError(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Sitemap
        </button>
      </div>

      {/* Add sitemap form */}
      {showAdd && (
        <div className="mb-4 space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://your-store.myshopify.com/sitemap.xml"
              value={newUrl}
              onChange={(e) => { setNewUrl(e.target.value); setUrlError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-md bg-white font-mono text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
            <button
              onClick={() => { setShowAdd(false); setUrlError(""); setNewUrl(""); }}
              className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {urlError && <p className="text-xs text-red-500 pl-0.5">{urlError}</p>}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Total Sitemaps</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{sitemaps.length || "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Discovered URLs</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {sitemaps.length > 0 ? sitemaps.reduce((s, r) => s + r.discoveredUrls, 0) : "—"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Indexed URLs</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {sitemaps.length > 0 ? sitemaps.reduce((s, r) => s + r.indexedUrls, 0) : "—"}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {sitemaps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="h-7 w-7 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">No sitemaps yet</p>
            <p className="mt-1 text-xs text-gray-400">Click &ldquo;Add Sitemap&rdquo; to submit your first sitemap URL.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Sitemap URL
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">
                  Last Read
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">
                  Discovered
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28">
                  Indexed
                </th>
              </tr>
            </thead>
            <tbody>
              {sitemaps.map((sitemap, i) => {
                const config = STATUS_CONFIG[sitemap.status];
                const indexRatio =
                  sitemap.discoveredUrls > 0
                    ? Math.round((sitemap.indexedUrls / sitemap.discoveredUrls) * 100)
                    : 0;
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0">
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-mono text-gray-600">{sitemap.url}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{sitemap.lastRead}</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-700">
                      {sitemap.discoveredUrls > 0 ? sitemap.discoveredUrls : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sitemap.indexedUrls > 0 && (
                          <span className="text-[10px] text-gray-400">{indexRatio}%</span>
                        )}
                        <span className="text-xs tabular-nums text-gray-700">
                          {sitemap.indexedUrls > 0 ? sitemap.indexedUrls : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Error note */}
      {errorCount > 0 && (
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-md">
          <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-700">
            <span className="font-medium">{errorCount} sitemap{errorCount > 1 ? "s have" : " has"} errors.</span>{" "}
            Check that the URL is accessible and returns valid XML.
          </p>
        </div>
      )}
    </div>
  );
}
