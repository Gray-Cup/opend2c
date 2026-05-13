"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function deriveSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let websiteUrl = domain.trim();
    if (websiteUrl && !websiteUrl.startsWith("http")) {
      websiteUrl = "https://" + websiteUrl;
    }

    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: deriveSlug(name),
        website_url: websiteUrl || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save store");
      return;
    }

    const brand = await res.json().catch(() => ({}));
    router.push(`/${brand.slug ?? ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="store-name" className="block text-sm font-medium text-gray-700 mb-2">
          Store name <span className="text-red-500">*</span>
        </label>
        <input
          id="store-name"
          type="text"
          placeholder="Brahmaputra Estates"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
          Store domain
        </label>
        <input
          id="domain"
          type="text"
          placeholder="yourstore.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <p className="mt-1.5 text-xs text-gray-400">Optional — you can add this later.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors mt-2"
      >
        {loading ? "Setting up…" : "Continue to dashboard"}
      </button>
    </form>
  );
}
