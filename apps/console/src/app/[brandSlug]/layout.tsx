import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { listBrandsByUserId } from "@/lib/scraper-store";
import { Sidebar } from "@/components/visibility/sidebar";
import { Topbar } from "@/components/visibility/topbar";

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandSlug: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const brands = await listBrandsByUserId(session.user.id);
  if (brands.length === 0) redirect("/onboarding");

  const { brandSlug } = await params;
  const brand = brands.find((b) => b.slug === brandSlug);
  if (!brand) {
    // Slug doesn't belong to this user — send to their first brand
    redirect(`/${brands[0].slug}`);
  }

  return (
    <div className="flex h-screen bg-[#f0f4fa] overflow-hidden">
      <Sidebar brandSlug={brandSlug} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
