import { withSupabase } from "@supabase/server";
import { canAccessStore, getAdminUserContext, jsonError } from "@/lib/admin/auth";

export const runtime = "nodejs";

type ProductPatch = {
  storeSlug?: unknown;
  productId?: unknown;
  description?: unknown;
  availabilityStatus?: unknown;
  variants?: {
    id?: unknown;
    priceInr?: unknown;
    availabilityStatus?: unknown;
  }[];
};

export const GET = withSupabase({ auth: "user" }, async (request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  const storeSlug = new URL(request.url).searchParams.get("storeSlug") ?? user.stores[0]?.slug;

  if (!storeSlug || !canAccessStore(user, storeSlug)) {
    return jsonError("Store access denied.", 403);
  }

  const { data, error: productsError } = await admin
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        short_name,
        description,
        availability_status,
        is_visible,
        display_order,
        stores!inner (
          slug
        ),
        product_variants (
          id,
          label,
          unit_value,
          price_inr,
          availability_status,
          is_visible,
          display_order
        )
      `
    )
    .eq("stores.slug", storeSlug)
    .order("display_order", { ascending: true });

  if (productsError) {
    return jsonError("Could not load products.", 500);
  }

  return Response.json({
    products: ((data ?? []) as any[]).map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      shortName: product.short_name,
      description: product.description,
      availabilityStatus: product.availability_status,
      isVisible: product.is_visible,
      variants: [...(product.product_variants ?? [])]
        .sort((left: any, right: any) => left.display_order - right.display_order)
        .map((variant: any) => ({
          id: variant.id,
          label: variant.label,
          unitValue: variant.unit_value,
          priceInr: variant.price_inr,
          availabilityStatus: variant.availability_status,
          isVisible: variant.is_visible
        }))
    }))
  });
});

export const PATCH = withSupabase({ auth: "user" }, async (request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  let body: ProductPatch;

  try {
    body = (await request.json()) as ProductPatch;
  } catch {
    return jsonError("Invalid product update payload.", 400);
  }

  const parsed = parseProductPatch(body);

  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  if (!canAccessStore(user, parsed.storeSlug)) {
    return jsonError("Store access denied.", 403);
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, store_id, stores!inner(slug)")
    .eq("id", parsed.productId)
    .eq("stores.slug", parsed.storeSlug)
    .single();

  if (productError || !product) {
    return jsonError("Product not found.", 404);
  }

  const { error: updateError } = await admin
    .from("products")
    .update({
      description: parsed.description,
      availability_status: parsed.availabilityStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", parsed.productId);

  if (updateError) {
    return jsonError("Product could not be updated.", 500);
  }

  for (const variant of parsed.variants) {
    const { error: variantError } = await admin
      .from("product_variants")
      .update({
        price_inr: variant.priceInr,
        availability_status: variant.availabilityStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", variant.id)
      .eq("product_id", parsed.productId);

    if (variantError) {
      return jsonError("One or more variants could not be updated.", 500);
    }
  }

  return Response.json({ ok: true });
});

function parseProductPatch(body: ProductPatch):
  | {
      ok: true;
      storeSlug: string;
      productId: string;
      description: string;
      availabilityStatus: "available" | "unavailable";
      variants: { id: string; priceInr: number; availabilityStatus: "available" | "unavailable" }[];
    }
  | { ok: false; error: string } {
  const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug.trim() : "";
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const availabilityStatus =
    body.availabilityStatus === "available" || body.availabilityStatus === "unavailable"
      ? body.availabilityStatus
      : null;

  if (!storeSlug || !productId || !availabilityStatus) {
    return { ok: false, error: "Product update is incomplete." };
  }

  if (description.length > 600) {
    return { ok: false, error: "Description is too long." };
  }

  if (!Array.isArray(body.variants)) {
    return { ok: false, error: "Variants are required." };
  }

  const variants = body.variants.map((variant) => ({
    id: typeof variant.id === "string" ? variant.id.trim() : "",
    priceInr: Number(variant.priceInr),
    availabilityStatus:
      variant.availabilityStatus === "available" || variant.availabilityStatus === "unavailable"
        ? variant.availabilityStatus
        : null
  }));

  if (
    variants.some(
      (variant) =>
        !variant.id ||
        !variant.availabilityStatus ||
        !Number.isInteger(variant.priceInr) ||
        variant.priceInr < 0
    )
  ) {
    return { ok: false, error: "Variant update is invalid." };
  }

  return {
    ok: true,
    storeSlug,
    productId,
    description,
    availabilityStatus,
    variants: variants as {
      id: string;
      priceInr: number;
      availabilityStatus: "available" | "unavailable";
    }[]
  };
}
