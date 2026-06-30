import { notFound } from "next/navigation";
import { eyalStore, getStoreBySlug } from "@/lib/demo-store";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";

export const dynamicParams = false;

type StorePageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export function generateStaticParams() {
  return [{ storeSlug: eyalStore.slug }];
}

export default async function StorePage({ params }: StorePageProps) {
  const { storeSlug } = await params;
  const store = getStoreBySlug(storeSlug);

  if (!store) {
    notFound();
  }

  return <StorefrontApp store={store} />;
}
