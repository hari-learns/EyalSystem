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
const MERCHANT_STATUS_VALUES = new Set(["new", "delivered", "completed", "cancelled"]);

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

  const { data: monthRows, error: monthsError } = await admin
    .from("orders")
    .select(
      `
        placed_at,
        stores!inner (
          slug
        )
      `
    )
    .eq("stores.slug", storeSlug)
    .order("placed_at", { ascending: false })
    .limit(500);

  if (monthsError) {
    return jsonError("Could not load order months.", 500);
  }

  const status = url.searchParams.get("status");
  const search = normalizeSearch(url.searchParams.get("search") ?? "");
  const month = url.searchParams.get("month") ?? "";
  const format = url.searchParams.get("format") ?? "json";
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const monthRange = month ? getMonthRange(month) : null;

  if (month && !monthRange) {
    return jsonError("Invalid order month.", 400);
  }

  let query = admin
    .from("orders")
    .select(getOrdersSelect(true))
    .eq("stores.slug", storeSlug)
    .order("placed_at", { ascending: false })
    .limit(format === "csv" ? 500 : 80);

  const dbStatus = status === "delivered" ? "completed" : status;

  if (dbStatus && ORDER_STATUSES.has(dbStatus as OrderStatus)) {
    query = query.eq("status", dbStatus);
  }

  if (monthRange) {
    query = query.gte("placed_at", monthRange.start).lt("placed_at", monthRange.end);
  } else if (dateFrom) {
    query = query.gte("placed_at", `${dateFrom}T00:00:00.000Z`);
  }

  if (!monthRange && dateTo) {
    query = query.lte("placed_at", `${dateTo}T23:59:59.999Z`);
  }

  if (search) {
    query = search.startsWith("+91")
      ? query.eq("customer_phone", search)
      : query.ilike("customer_name", `%${search}%`);
  }

  let { data, error: ordersError } = await query;

  if (isMissingRateDisplayModeColumn(ordersError)) {
    let fallbackQuery = admin
      .from("orders")
      .select(getOrdersSelect(false))
      .eq("stores.slug", storeSlug)
      .order("placed_at", { ascending: false })
      .limit(format === "csv" ? 500 : 80);

    if (dbStatus && ORDER_STATUSES.has(dbStatus as OrderStatus)) {
      fallbackQuery = fallbackQuery.eq("status", dbStatus);
    }

    if (monthRange) {
      fallbackQuery = fallbackQuery.gte("placed_at", monthRange.start).lt("placed_at", monthRange.end);
    } else if (dateFrom) {
      fallbackQuery = fallbackQuery.gte("placed_at", `${dateFrom}T00:00:00.000Z`);
    }

    if (!monthRange && dateTo) {
      fallbackQuery = fallbackQuery.lte("placed_at", `${dateTo}T23:59:59.999Z`);
    }

    if (search) {
      fallbackQuery = search.startsWith("+91")
        ? fallbackQuery.eq("customer_phone", search)
        : fallbackQuery.ilike("customer_name", `%${search}%`);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    ordersError = fallback.error;
  }

  if (ordersError) {
    return jsonError("Could not load orders.", 500);
  }

  const orders = ((data ?? []) as any[]).map((order) => ({
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
        rateDisplayMode: item.rate_display_mode ?? "fixed",
        quantity: item.quantity,
        lineTotalInr: item.line_total_inr
      }))
    }));

  if (format === "csv") {
    return new Response(renderOrdersCsv(orders), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${storeSlug}-${month || "orders"}.csv\"`
      }
    });
  }

  return Response.json({
    orders,
    months: getOrderMonths((monthRows ?? []) as { placed_at: string }[])
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
  const requestedStatus = typeof body.status === "string" ? body.status.trim() : "";
  const status = requestedStatus === "delivered" ? "completed" : requestedStatus;

  if (
    !storeSlug ||
    !orderId ||
    !MERCHANT_STATUS_VALUES.has(requestedStatus) ||
    !ORDER_STATUSES.has(status as OrderStatus)
  ) {
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

function getMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;

  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getOrderMonths(orders: { placed_at: string }[]) {
  return Array.from(new Set(orders.map((order) => order.placed_at.slice(0, 7)))).sort().reverse();
}

function renderOrdersCsv(orders: any[]) {
  const rows = [
    [
      "Order",
      "Placed At",
      "Customer",
      "Phone",
      "Status",
      "Known Total",
      "Items"
    ],
    ...orders.map((order) => [
      `#${order.orderNumber}`,
      order.placedAt,
      order.customerName,
      order.customerPhone,
      order.status === "completed" ? "delivered" : order.status,
      String(order.totalInr),
      order.items
        .map((item: any) => {
          const amount =
            item.rateDisplayMode === "on_call" ? "Rate on call" : `Rs. ${item.lineTotalInr}`;
          return `${item.productName} (${item.variantLabel}) x ${item.quantity} - ${amount}`;
        })
        .join("; ")
    ])
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function getOrdersSelect(includeRateDisplayMode: boolean) {
  return `
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
      ${includeRateDisplayMode ? "rate_display_mode," : ""}
      quantity,
      line_total_inr
    ),
    stores!inner (
      slug
    )
  `;
}

function isMissingRateDisplayModeColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return message.includes("rate_display_mode");
}
