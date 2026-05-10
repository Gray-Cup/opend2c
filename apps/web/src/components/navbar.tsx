"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { startTopLoader } from "@/components/top-loader";

function SearchForm({
  className,
  inputClassName,
  onSubmit,
}: {
  className?: string;
  inputClassName?: string;
  onSubmit?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    onSubmit?.();
    startTopLoader();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-center ${className ?? ""}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className={`w-full rounded-l-md border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${inputClassName ?? ""}`}
        />
      </div>
      <button
        type="submit"
        className="rounded-r-md border border-l-0 border-neutral-200 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors shrink-0"
      >
        Search
      </button>
    </form>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          {/* LEFT — logo + search */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-neutral-900 shrink-0"
            >
              Open D2C
            </Link>

            <SearchForm className="hidden md:flex w-full max-w-xs lg:max-w-sm" />
          </div>

          {/* RIGHT — nav links + store buttons */}
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <Link
              href="/government-tenders"
              className="hidden md:block rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Gov Schemes
            </Link>
            <Link
              href="/about"
              className="hidden md:block rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              About
            </Link>

            <div className="hidden lg:flex items-center gap-2 ml-2">
              <Link href="/login">
                <Button variant="redoutline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="gray" size="sm">
                  Register
                </Button>
              </Link>
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-neutral-100"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-50 transition-opacity ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-xl transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <button
            className="mb-4 rounded-md cursor-pointer p-2 hover:bg-neutral-100"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>

          <SearchForm className="mb-4" onSubmit={() => setMenuOpen(false)} />

          <nav className="flex flex-col gap-1 text-sm font-medium">
            {[
              ["Gov Schemes", "/government-tenders"],
              ["About", "/about"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 hover:bg-neutral-100"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="redoutline" size="sm" className="w-full">
                Login
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button variant="gray" size="sm" className="w-full">
                Register
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
