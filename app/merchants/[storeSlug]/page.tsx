import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/demo-store";
import { getStorefrontStoreBySlug } from "@/lib/supabase/storefront";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";

export const dynamic = "force-dynamic";

type StorePageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { storeSlug } = await params;
  const { data: dbStore } = await getStorefrontStoreBySlug(storeSlug);
  const store =
    dbStore ?? (process.env.NODE_ENV === "development" ? getStoreBySlug(storeSlug) : null);

  if (!store) {
    notFound();
  }

  return <StorefrontApp store={store} />;
}
