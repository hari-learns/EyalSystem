import { withSupabase } from "@supabase/server";

export const runtime = "nodejs";

type CheckoutItemInput = {
  variantId?: unknown;
  quantity?: unknown;
};

type CheckoutPayload = {
  storeSlug?: unknown;
  customer?: {
    customerName?: unknown;
    phone10?: unknown;
    address?: unknown;
    note?: unknown;
  };
  items?: CheckoutItemInput[];
  phoneVerified?: unknown;
};

type StoreRow = {
  id: string;
  slug: string;
  status: string;
  settings: Record<string, unknown> | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  label: string;
  unit: string;
  unit_value: number;
  price_inr: number;
  availability_status: "available" | "unavailable";
  is_visible: boolean;
  products:
    | {
        id: string;
        store_id: string;
        name: string;
        availability_status: "available" | "unavailable";
        is_visible: boolean;
      }
    | {
        id: string;
        store_id: string;
        name: string;
        availability_status: "available" | "unavailable";
        is_visible: boolean;
      }[];
};

type OrderItemInsert = {
  order_id: string;
  store_id: string;
  product_id: string;
  product_variant_id: string;
  product_name_snapshot: string;
  variant_label_snapshot: string;
  unit_snapshot: string;
  unit_value_snapshot: number;
  price_inr_snapshot: number;
  quantity: number;
  line_total_inr: number;
};

const PHONE_10_DIGITS = /^\d{10}$/;
const MAX_CART_LINES = 30;
const MAX_LINE_QUANTITY = 99;

export const POST = withSupabase({ auth: "none" }, async (request, ctx) => {
  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return jsonError("Invalid checkout payload.", 400);
  }

  const parsed = parseCheckoutPayload(payload);

  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const { storeSlug, customer, items, phoneVerified } = parsed;
  // The project does not have generated Supabase database types yet.
  // Keep the runtime client typed loosely here and validate DB rows explicitly below.
  const admin = ctx.supabaseAdmin as any;

  const { data: storeData, error: storeError } = await admin
    .from("stores")
    .select("id, slug, status, settings")
    .eq("slug", storeSlug)
    .eq("status", "active")
    .single();

  const store = storeData as StoreRow | null;

  if (storeError || !store) {
    return jsonError("Store is not available.", 404);
  }

  const requiresPhoneVerification = Boolean(store.settings?.requires_phone_verification);

  if (requiresPhoneVerification && phoneVerified !== true) {
    return jsonError("Phone verification is required before checkout.", 403);
  }

  const requestedVariantIds = items.map((item) => item.variantId);
  const { data: variantsData, error: variantsError } = await admin
    .from("product_variants")
    .select(
      `
        id,
        product_id,
        label,
        unit,
        unit_value,
        price_inr,
        availability_status,
        is_visible,
        products!inner (
          id,
          store_id,
          name,
          availability_status,
          is_visible
        )
      `
    )
    .in("id", requestedVariantIds);

  const variants = (variantsData ?? []) as VariantRow[];

  if (variantsError || !variants) {
    return jsonError("Products could not be verified.", 500);
  }

  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const orderItems: Omit<OrderItemInsert, "order_id">[] = [];
  let itemCount = 0;
  let subtotalInr = 0;

  for (const item of items) {
    const variant = variantsById.get(item.variantId);
    const product = Array.isArray(variant?.products) ? variant?.products[0] : variant?.products;

    if (!variant || !product || product.store_id !== store.id) {
      return jsonError("One or more cart items are not available.", 400);
    }

    if (
      !variant.is_visible ||
      variant.availability_status !== "available" ||
      !product.is_visible ||
      product.availability_status !== "available"
    ) {
      return jsonError("One or more cart items are currently unavailable.", 400);
    }

    const lineTotal = variant.price_inr * item.quantity;
    itemCount += item.quantity;
    subtotalInr += lineTotal;

    orderItems.push({
      store_id: store.id,
      product_id: product.id,
      product_variant_id: variant.id,
      product_name_snapshot: product.name,
      variant_label_snapshot: variant.label,
      unit_snapshot: variant.unit,
      unit_value_snapshot: variant.unit_value,
      price_inr_snapshot: variant.price_inr,
      quantity: item.quantity,
      line_total_inr: lineTotal
    });
  }

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .insert({
      store_id: store.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_note: customer.note || null,
      status: "new",
      email_status: "not_sent",
      subtotal_inr: subtotalInr,
      total_inr: subtotalInr,
      item_count: itemCount
    })
    .select("id, order_number, total_inr, status")
    .single();

  const order = orderData as
    | { id: string; order_number: number; total_inr: number; status: string }
    | null;

  if (orderError || !order) {
    return jsonError("Order could not be saved.", 500);
  }

  const { error: itemInsertError } = await admin
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemInsertError) {
    await admin.from("orders").delete().eq("id", order.id);
    return jsonError("Order items could not be saved.", 500);
  }

  return Response.json(
    {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalInr: order.total_inr,
        status: order.status
      }
    },
    { status: 201 }
  );
});

function parseCheckoutPayload(payload: CheckoutPayload):
  | {
      ok: true;
      storeSlug: string;
      customer: { name: string; phone: string; address: string; note: string };
      items: { variantId: string; quantity: number }[];
      phoneVerified: boolean;
    }
  | { ok: false; error: string } {
  const storeSlug = typeof payload.storeSlug === "string" ? payload.storeSlug.trim() : "";
  const customerName =
    typeof payload.customer?.customerName === "string"
      ? payload.customer.customerName.trim()
      : "";
  const phone10 =
    typeof payload.customer?.phone10 === "string"
      ? payload.customer.phone10.replace(/\D/g, "")
      : "";
  const address =
    typeof payload.customer?.address === "string" ? payload.customer.address.trim() : "";
  const note = typeof payload.customer?.note === "string" ? payload.customer.note.trim() : "";

  if (!storeSlug) return { ok: false, error: "Store is required." };
  if (customerName.length < 2) return { ok: false, error: "Enter a valid name." };
  if (!PHONE_10_DIGITS.test(phone10)) {
    return { ok: false, error: "Enter a valid 10 digit mobile number." };
  }
  if (address.length < 5) return { ok: false, error: "Enter a valid address or area." };
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { ok: false, error: "Cart is empty." };
  }
  if (payload.items.length > MAX_CART_LINES) {
    return { ok: false, error: "Cart has too many different items." };
  }

  const items: { variantId: string; quantity: number }[] = [];
  const seen = new Set<string>();

  for (const item of payload.items) {
    const variantId = typeof item.variantId === "string" ? item.variantId.trim() : "";
    const quantity = Number(item.quantity);

    if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return { ok: false, error: "Cart contains an invalid item." };
    }

    if (seen.has(variantId)) {
      return { ok: false, error: "Cart contains duplicate items." };
    }

    seen.add(variantId);
    items.push({ variantId, quantity });
  }

  return {
    ok: true,
    storeSlug,
    customer: {
      name: customerName,
      phone: `+91${phone10}`,
      address,
      note
    },
    items,
    phoneVerified: payload.phoneVerified === true
  };
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}
