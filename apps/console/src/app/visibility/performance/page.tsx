"use client";

import { useState, useMemo } from "react";
import { SimpleChart } from "@/components/visibility/simple-chart";
import { PERFORMANCE_DATA, TOP_QUERIES } from "@/lib/visibility-data";

type SortField = "query" | "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current)
    return (
      <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    );
  return (
    <svg className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={dir === "desc" ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
    </svg>
  );
}

const CHART_TOGGLES = [
  { key: "impressions" as const, label: "Impressions", color: "bg-blue-500" },
  { key: "clicks" as const, label: "Clicks", color: "bg-emerald-500" },
];

export default function PerformancePage() {
  const [showImpressions, setShowImpressions] = useState(true);
  const [showClicks, setShowClicks] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "clicks",
    dir: "desc",
  });

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { field, dir: "desc" }
    );
  };

  const filtered = useMemo(() => {
    let rows = [...TOP_QUERIES];
    if (search.trim()) {
      rows = rows.filter((q) =>
        q.query.toLowerCase().includes(search.toLowerCase())
      );
    }
    rows.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      const diff =
        typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sort.dir === "desc" ? -diff : diff;
    });
    return rows;
  }, [search, sort]);

  const thClass =
    "px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide select-none cursor-pointer hover:text-gray-600 transition-colors";
  const thRightClass = `${thClass} text-right`;

  const totals = useMemo(() => {
    const n = TOP_QUERIES.length;
    return {
      clicks:      TOP_QUERIES.reduce((s, q) => s + q.clicks, 0),
      impressions: TOP_QUERIES.reduce((s, q) => s + q.impressions, 0),
      avgCtr:      n > 0 ? (TOP_QUERIES.reduce((s, q) => s + q.ctr, 0) / n).toFixed(1) : "—",
      avgPosition: n > 0 ? (TOP_QUERIES.reduce((s, q) => s + q.position, 0) / n).toFixed(1) : "—",
    };
  }, []);

  return (
    <div className="px-10 py-8 max-w-[1200px]">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Performance</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Search performance for your store · Last 28 days
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Clicks",       value: TOP_QUERIES.length > 0 ? totals.clicks.toLocaleString() : "—" },
          { label: "Total Impressions",  value: TOP_QUERIES.length > 0 ? totals.impressions.toLocaleString() : "—" },
          { label: "Avg. CTR",           value: totals.avgCtr === "—" ? "—" : `${totals.avgCtr}%` },
          { label: "Avg. Position",      value: totals.avgPosition },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-md px-4 py-3.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{m.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-gray-900 tracking-tight">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-md px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Search Performance Trend
          </h2>
          <div className="flex items-center gap-2">
            {CHART_TOGGLES.map((t) => {
              const active = t.key === "impressions" ? showImpressions : showClicks;
              return (
                <button
                  key={t.key}
                  onClick={() =>
                    t.key === "impressions"
                      ? setShowImpressions((v) => !v)
                      : setShowClicks((v) => !v)
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    active
                      ? "border-gray-300 text-gray-700 bg-white"
                      : "border-gray-100 text-gray-300 bg-gray-50"
                  }`}
                >
                  <span className={`h-1.5 w-3 rounded ${active ? t.color : "bg-gray-200"}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <SimpleChart
          data={PERFORMANCE_DATA}
          showImpressions={showImpressions}
          showClicks={showClicks}
        />
      </div>

      {/* Query table */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Top Queries
          </h2>
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter queries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-44 transition-all"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={thClass} onClick={() => handleSort("query")}>
                <span className="flex items-center gap-1">
                  Query <SortIcon field="query" current={sort.field} dir={sort.dir} />
                </span>
              </th>
              <th className={thRightClass} onClick={() => handleSort("clicks")}>
                <span className="flex items-center justify-end gap-1">
                  Clicks <SortIcon field="clicks" current={sort.field} dir={sort.dir} />
                </span>
              </th>
              <th className={thRightClass} onClick={() => handleSort("impressions")}>
                <span className="flex items-center justify-end gap-1">
                  Impressions <SortIcon field="impressions" current={sort.field} dir={sort.dir} />
                </span>
              </th>
              <th className={thRightClass} onClick={() => handleSort("ctr")}>
                <span className="flex items-center justify-end gap-1">
                  CTR <SortIcon field="ctr" current={sort.field} dir={sort.dir} />
                </span>
              </th>
              <th className={thRightClass} onClick={() => handleSort("position")}>
                <span className="flex items-center justify-end gap-1">
                  Position <SortIcon field="position" current={sort.field} dir={sort.dir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, i) => (
              <tr
                key={i}
                className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0"
              >
                <td className="px-4 py-3 text-xs text-gray-800">{q.query}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{
                          width: `${(q.clicks / Math.max(...TOP_QUERIES.map((x) => x.clicks))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-gray-700 w-10 text-right">
                      {q.clicks.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{
                          width: `${(q.impressions / Math.max(...TOP_QUERIES.map((x) => x.impressions))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-gray-500 w-14 text-right">
                      {q.impressions.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-700">
                  {q.ctr}%
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-700">
                  {q.position.toFixed(1)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">
                  No queries match &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
