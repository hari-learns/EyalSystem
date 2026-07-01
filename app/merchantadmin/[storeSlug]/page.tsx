import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

type MerchantAdminPageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function MerchantAdminPage({ params }: MerchantAdminPageProps) {
  const { storeSlug } = await params;

  return <AdminApp initialStoreSlug={storeSlug} />;
}
