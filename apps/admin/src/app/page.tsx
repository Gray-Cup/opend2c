import { redirect } from "next/navigation";
import { getServerSession, isAdmin } from "@/lib/session";
import { adminListAllBrands } from "@/lib/store";
import BrandsGrid from "./brands-grid";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">{session.user.email} is not an admin.</p>
          <a href="/api/auth/sign-out" className="text-xs text-blue-600 hover:underline mt-3 block">Sign out</a>
        </div>
      </div>
    );
  }

  const brands = await adminListAllBrands();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Open D2C</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{session.user.email}</span>
          <a
            href="/api/auth/sign-out"
            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded transition-colors"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        <BrandsGrid initialBrands={brands} />
      </main>
    </div>
  );
}
