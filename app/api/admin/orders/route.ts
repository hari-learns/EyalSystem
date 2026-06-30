import { withSupabase } from "@supabase/server";
import { canAccessStore, getAdminUserContext, jsonError } from "@/lib/admin/auth";

export const runtime = "nodejs";

type OrderStatus = "new" | "contacted" | "completed" | "cancelled";

type OrderPatch = {
  storeSlug?: unknown;
  orderId?: unknown;
  status?: unknown;
};

const ORDER_STATUSES = new Set<OrderStatus>(["new", "contacted", "completed", "cancelled"]);

export const GET = withSupabase({ auth: "user" }, async (request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  const url = new URL(request.url);
  const storeSlug = url.searchParams.get("storeSlug") ?? user.stores[0]?.slug;

  if (!storeSlug || !canAccessStore(user, storeSlug)) {
    return jsonError("Store access denied.", 403);
  }

  const status = url.searchParams.get("status");
  const search = normalizeSearch(url.searchParams.get("search") ?? "");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  let query = admin
    .from("orders")
    .select(
      `
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_address,
        customer_note,
        status,
        email_status,
        email_error,
        total_inr,
        item_count,
        placed_at,
        order_items (
          id,
          product_name_snapshot,
          variant_label_snapshot,
          price_inr_snapshot,
          quantity,
          line_total_inr
        ),
        stores!inner (
          slug
        )
      `
    )
    .eq("stores.slug", storeSlug)
    .order("placed_at", { ascending: false })
    .limit(80);

  if (status && ORDER_STATUSES.has(status as OrderStatus)) {
    query = query.eq("status", status);
  }

  if (dateFrom) {
    query = query.gte("placed_at", `${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    query = query.lte("placed_at", `${dateTo}T23:59:59.999Z`);
  }

  if (search) {
    query = search.startsWith("+91")
      ? query.eq("customer_phone", search)
      : query.ilike("customer_name", `%${search}%`);
  }

  const { data, error: ordersError } = await query;

  if (ordersError) {
    return jsonError("Could not load orders.", 500);
  }

  return Response.json({
    orders: ((data ?? []) as any[]).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      customerNote: order.customer_note,
      status: order.status,
      emailStatus: order.email_status,
      emailError: order.email_error,
      totalInr: order.total_inr,
      itemCount: order.item_count,
      placedAt: order.placed_at,
      items: (order.order_items ?? []).map((item: any) => ({
        id: item.id,
        productName: item.product_name_snapshot,
        variantLabel: item.variant_label_snapshot,
        priceInr: item.price_inr_snapshot,
        quantity: item.quantity,
        lineTotalInr: item.line_total_inr
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

  let body: OrderPatch;

  try {
    body = (await request.json()) as OrderPatch;
  } catch {
    return jsonError("Invalid order update payload.", 400);
  }

  const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug.trim() : "";
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (!storeSlug || !orderId || !ORDER_STATUSES.has(status as OrderStatus)) {
    return jsonError("Order update is incomplete.", 400);
  }

  if (!canAccessStore(user, storeSlug)) {
    return jsonError("Store access denied.", 403);
  }

  const timestampUpdates =
    status === "contacted"
      ? { contacted_at: new Date().toISOString() }
      : status === "completed"
        ? { completed_at: new Date().toISOString() }
        : status === "cancelled"
          ? { cancelled_at: new Date().toISOString() }
          : {};

  const { data, error: updateError } = await admin
    .from("orders")
    .update({
      status,
      ...timestampUpdates,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId)
    .select("id, stores!inner(slug)")
    .eq("stores.slug", storeSlug)
    .single();

  if (updateError || !data) {
    return jsonError("Order could not be updated.", 500);
  }

  return Response.json({ ok: true });
});

function normalizeSearch(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;

  return trimmed;
}
