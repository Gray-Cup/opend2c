import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { listBrandsByUserId } from "@/lib/scraper-store";

export default async function RootPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const brands = await listBrandsByUserId(session.user.id);
  if (brands.length === 0) redirect("/onboarding");

  redirect(`/${brands[0].slug}`);
}
