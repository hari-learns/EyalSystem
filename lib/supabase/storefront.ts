import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, StoreCategory, StorefrontStore } from "@/lib/demo-store";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  nav_brand: string;
  location: string | null;
  logo_path: string | null;
  contact_numbers: string[];
  theme: Record<string, string> | null;
  categories: CategoryRow[];
  products: ProductRow[];
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  display_order: number;
  is_visible: boolean;
};

type ProductRow = {
  id: string;
  category_id: string;
  sku: string;
  name: string;
  short_name: string;
  description: string;
  image_path: string | null;
  availability_status: "available" | "unavailable";
  is_visible: boolean;
  display_order: number;
  product_variants: ProductVariantRow[];
};

type ProductVariantRow = {
  id: string;
  label: string;
  unit_value: number;
  price_inr: number;
  availability_status: "available" | "unavailable";
  is_visible: boolean;
  display_order: number;
};

let storefrontClient: SupabaseClient | null = null;

function getStorefrontClient() {
  if (storefrontClient) return storefrontClient;

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  storefrontClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return storefrontClient;
}

export async function getStorefrontStoreBySlug(slug: string) {
  const supabase = getStorefrontClient();

  if (!supabase) {
    return { data: null, error: new Error("Missing Supabase storefront env") };
  }

  const { data, error } = await supabase
    .from("stores")
    .select(
      `
        id,
        slug,
        name,
        nav_brand,
        location,
        logo_path,
        contact_numbers,
        theme,
        categories (
          id,
          slug,
          name,
          description,
          display_order,
          is_visible
        ),
        products (
          id,
          category_id,
          sku,
          name,
          short_name,
          description,
          image_path,
          availability_status,
          is_visible,
          display_order,
          product_variants (
            id,
            label,
            unit_value,
            price_inr,
            availability_status,
            is_visible,
            display_order
          )
        )
      `
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single<StoreRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: mapStoreRow(data), error: null };
}

function mapStoreRow(row: StoreRow): StorefrontStore {
  const visibleCategories = row.categories
    .filter((category) => category.is_visible)
    .sort((left, right) => left.display_order - right.display_order);

  const categoryIdToSlug = new Map(
    visibleCategories.map((category) => [category.id, category.slug])
  );

  const categories: StoreCategory[] = visibleCategories.map((category) => ({
    id: category.slug,
    name: category.name,
    description: category.description
  }));

  const products: Product[] = row.products
    .filter((product) => product.is_visible && categoryIdToSlug.has(product.category_id))
    .sort((left, right) => left.display_order - right.display_order)
    .map((product) => {
      const variants = product.product_variants
        .filter((variant) => variant.is_visible)
        .sort((left, right) => left.display_order - right.display_order)
        .map((variant) => ({
          id: variant.id,
          label: variant.label,
          ml: variant.unit_value,
          price: variant.price_inr,
          availabilityStatus: variant.availability_status
        }));

      return {
        id: product.sku,
        categoryId: categoryIdToSlug.get(product.category_id)!,
        name: product.name,
        shortName: product.short_name,
        note: product.description,
        image: product.image_path ?? "/images/coconut.jpg",
        availabilityStatus: product.availability_status,
        variants
      };
    });

  return {
    slug: row.slug,
    name: row.name,
    navBrand: row.nav_brand,
    location: row.location ?? "",
    phoneNumbers: row.contact_numbers ?? [],
    theme: {
      primary: row.theme?.primary ?? "#2b1d12",
      accent: row.theme?.accent ?? "#a67c2e",
      surface: row.theme?.surface ?? "#f5efe3"
    },
    categories,
    products
  };
}
