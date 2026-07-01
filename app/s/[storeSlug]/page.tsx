import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type StorePageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { storeSlug } = await params;
  redirect(`/merchants/${storeSlug}`);
}
