"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartTooltipContent } from "@/components/ui/chart";

type TopProduct = {
  id: number;
  title: string;
  shop: string;
  source_url: string;
  click_count: number;
};

type DailyClicks = { date: string; clicks: number };

type ClickAnalytics = {
  totalClicks: number;
  activeProducts: number;
  topProducts: TopProduct[];
  dailyClicks: DailyClicks[];
};

type IssueProduct = {
  id: number;
  title: string;
  shop: string;
  source_url: string;
  image: string | null;
  price: string | null;
  issues: string[];
};

type IssuesSummary = {
  total: number;
  noImage: number;
  noPrice: number;
  products: IssueProduct[];
};

const ISSUE_META: Record<string, { color: string; bg: string; border: string; description: string }> = {
  "No image": {
    color:       "text-amber-700",
    bg:          "bg-amber-50",
    border:      "border-amber-200",
    description: "Product has no image — it won't look good on the marketplace.",
  },
  "No price": {
    color:       "text-red-700",
    bg:          "bg-red-50",
    border:      "border-red-200",
    description: "Price is missing — product is hidden from the public marketplace.",
  },
};

const PRESETS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function truncateWords(text: string, n: number) {
  const words = text.split(/\s+/);
  return words.length <= n ? text : words.slice(0, n).join(" ") + "…";
}

function fillDailyGaps(dailyClicks: DailyClicks[], start: Date, end: Date): DailyClicks[] {
  const byDate = Object.fromEntries(dailyClicks.map((d) => [d.date, d.clicks]));
  return eachDayOfInterval({ start, end: new Date(end.getTime() - 1) }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, clicks: byDate[key] ?? 0 };
  });
}

export default function OverviewPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const [data, setData]             = useState<ClickAnalytics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [calOpen, setCalOpen]       = useState(false);
  const [preset, setPreset]         = useState(30);
  const [range, setRange]           = useState<DateRange | undefined>(undefined);
  const [issues, setIssues]         = useState<IssuesSummary | null>(null);
  const [showCategoryNudge, setShowCategoryNudge] = useState(false);

  const fetchData = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end:   end.toISOString(),
      });
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — last 30 days + issues + category nudge
  useEffect(() => {
    const end   = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 29));
    fetchData(start, end);
    fetch("/api/issues").then((r) => r.ok && r.json()).then((d) => d && setIssues(d));

    const dismissedKey = `category-nudge-dismissed-${brandSlug}`;
    if (!localStorage.getItem(dismissedKey)) {
      fetch("/api/brands")
        .then((r) => r.ok ? r.json() : [])
        .then((brands: { slug: string; categories: string[] }[]) => {
          const current = brands.find((b) => b.slug === brandSlug);
          if (current && (!current.categories || current.categories.length === 0)) {
            setShowCategoryNudge(true);
          }
        })
        .catch(() => {});
    }
  }, [fetchData, brandSlug]);

  function applyPreset(days: number) {
    setPreset(days);
    setRange(undefined);
    const end   = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days - 1));
    fetchData(start, end);
  }

  function applyRange(r: DateRange | undefined) {
    setRange(r);
    if (r?.from && r?.to) {
      setPreset(0);
      setCalOpen(false);
      fetchData(startOfDay(r.from), endOfDay(r.to));
    }
  }

  const totalClicks    = data?.totalClicks    ?? 0;
  const activeProducts = data?.activeProducts ?? 0;
  const topProducts    = data?.topProducts    ?? [];

  const chartStart = range?.from
    ? startOfDay(range.from)
    : startOfDay(subDays(new Date(), preset - 1));
  const chartEnd = range?.to
    ? endOfDay(range.to)
    : endOfDay(new Date());

  const chartData = data
    ? fillDailyGaps(data.dailyClicks, chartStart, chartEnd)
    : [];

  const rangeLabel = range?.from && range?.to
    ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
    : `Last ${preset} days`;

  return (
    <div className="px-6 py-5 max-w-[1200px] space-y-5">
      {showCategoryNudge && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-amber-500 shrink-0 text-base">⚡</span>
            <p className="text-xs text-amber-800 font-medium">
              Add categories to your brand so customers can find you when filtering by niche.{" "}
              <a href={`/${brandSlug}/brand`} className="underline underline-offset-2 hover:text-amber-900">
                Add now →
              </a>
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(`category-nudge-dismissed-${brandSlug}`, "1");
              setShowCategoryNudge(false);
            }}
            className="text-amber-400 hover:text-amber-600 shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards + date picker row */}
      <div className="flex items-start gap-4">
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Total clicks</p>
            <p className="text-3xl font-semibold text-gray-900 tabular-nums">
              {loading ? "—" : totalClicks.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">across all products</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Active products</p>
            <p className="text-3xl font-semibold text-gray-900 tabular-nums">
              {loading ? "—" : activeProducts.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">listed on marketplace</p>
          </div>
        </div>

        {/* Time frame controls */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.days && !range
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                range?.from
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                </svg>
                {range?.from && range?.to
                  ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
                  : "Custom range"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={range}
                onSelect={applyRange}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                defaultMonth={subDays(new Date(), 30)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Issues requiring attention */}
      {issues && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Issues requiring attention</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {issues.total === 0
                  ? "All products look good"
                  : `${issues.total} product${issues.total !== 1 ? "s" : ""} with issues — hidden from the marketplace`}
              </p>
            </div>
            {issues.total > 0 && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {issues.noImage > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${ISSUE_META["No image"].bg} ${ISSUE_META["No image"].color} border ${ISSUE_META["No image"].border}`}>
                    No image ×{issues.noImage}
                  </span>
                )}
                {issues.noPrice > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${ISSUE_META["No price"].bg} ${ISSUE_META["No price"].color} border ${ISSUE_META["No price"].border}`}>
                    No price ×{issues.noPrice}
                  </span>
                )}
              </div>
            )}
          </div>

          {issues.total === 0 ? (
            <div className="px-5 py-6 flex items-center gap-2 text-sm text-green-700">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All products look good — no issues found.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Shop</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Issues</th>
                </tr>
              </thead>
              <tbody>
                {issues.products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-900 hover:text-blue-600 font-medium"
                      >
                        {truncateWords(p.title, 6)}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{p.shop}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.issues.map((issue) => {
                          const meta = ISSUE_META[issue];
                          return meta ? (
                            <span
                              key={issue}
                              title={meta.description}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                            >
                              {issue}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {issues.total > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <a href={`/${brandSlug}/products?issues=1`} className="text-xs text-blue-600 hover:underline font-medium">
                Fix issues in Products →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Clicks over time chart */}
      <div className="bg-white border border-gray-200 rounded-lg px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Clicks over time</h2>
            <p className="text-xs text-gray-400 mt-0.5">{rangeLabel}</p>
          </div>
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : chartData.every((d) => d.clicks === 0) ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">
            No click data for this period.
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a73e8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickFormatter={(v) => format(parseISO(v), "MMM d")}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={(payload ?? []) as unknown as { name: string; value: number; color?: string }[]}
                      label={String(label ?? "")}
                      labelFormatter={(l) => format(parseISO(l), "EEEE, MMM d yyyy")}
                      formatter={(v) => [v.toLocaleString(), "Clicks"]}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  fill="url(#clickGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#1a73e8" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top clicked products */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Top products by clicks</h2>
          <p className="text-xs text-gray-400 mt-0.5">All-time totals</p>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : topProducts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No clicks recorded yet. They'll appear here once visitors interact with products.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Shop</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 w-24">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-900 hover:text-blue-600 font-medium"
                      >
                        {truncateWords(p.title, 6)}
                      </a>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{p.shop}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums font-semibold text-gray-900">
                    {p.click_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
