import { withSupabase } from "@supabase/server";
import { sendMerchantOrderEmail, type OrderEmailItem } from "@/lib/email/order-email";

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
    website?: unknown;
  };
  items?: CheckoutItemInput[];
  phoneVerified?: unknown;
};

type StoreRow = {
  id: string;
  name: string;
  merchantOrderEmail?: string | null;
  merchant_order_email?: string | null;
};

type OrderRpcItem = {
  productName: string;
  variantLabel: string;
  priceInr: number;
  rateDisplayMode: "fixed" | "on_call";
  quantity: number;
  lineTotalInr: number;
};

type OrderRpcResult = {
  store: StoreRow;
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerNote: string | null;
    totalInr: number;
    status: string;
    emailStatus: "pending" | "sent" | "failed" | "not_sent";
  };
  items: OrderRpcItem[];
};

const PHONE_10_DIGITS = /^\d{10}$/;
const MAX_CART_LINES = 30;
const MAX_LINE_QUANTITY = 99;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 12;
const checkoutAttempts = new Map<string, { count: number; resetAt: number }>();

export const POST = withSupabase({ auth: "none" }, async (request, ctx) => {
  const rateLimit = checkRateLimit(getClientIp(request));

  if (!rateLimit.ok) {
    console.warn(
      JSON.stringify({
        event: "checkout_rate_limited",
        resetAt: rateLimit.resetAt
      })
    );
    return jsonError("Too many checkout attempts. Please wait and try again.", 429);
  }

  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return jsonError("Invalid checkout payload.", 400);
  }

  const parsed = parseCheckoutPayload(payload);

  if (!parsed.ok) {
    console.warn(JSON.stringify({ event: "checkout_validation_failed", error: parsed.error }));
    return jsonError(parsed.error, 400);
  }

  const { storeSlug, customer, items, phoneVerified } = parsed;
  // The project does not have generated Supabase database types yet.
  // Keep the runtime client typed loosely here and validate DB rows explicitly below.
  const admin = ctx.supabaseAdmin as any;

  const { data: rpcData, error: rpcError } = await admin.rpc("create_checkout_order", {
    p_store_slug: storeSlug,
    p_customer_name: customer.name,
    p_customer_phone: customer.phone,
    p_customer_address: customer.address,
    p_customer_note: customer.note || null,
    p_items: items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity
    })),
    p_phone_verified: phoneVerified
  });

  if (rpcError || !rpcData) {
    const mapped = mapOrderRpcError(rpcError?.message ?? "");
    console.warn(
      JSON.stringify({
        event: "checkout_rpc_failed",
        storeSlug,
        error: rpcError?.message
      })
    );
    return jsonError(mapped.message, mapped.status);
  }

  const created = rpcData as OrderRpcResult;

  return finishOrder(admin, storeSlug, created);
});

async function finishOrder(admin: any, storeSlug: string, created: OrderRpcResult) {
  const emailResult = await sendMerchantOrderEmail({
    store: {
      name: created.store.name,
      merchantOrderEmail: created.store.merchantOrderEmail ?? created.store.merchant_order_email ?? null
    },
    order: {
      id: created.order.id,
      orderNumber: created.order.orderNumber,
      customerName: created.order.customerName,
      customerPhone: created.order.customerPhone,
      customerAddress: created.order.customerAddress,
      customerNote: created.order.customerNote,
      totalInr: created.order.totalInr
    },
    items: created.items.map<OrderEmailItem>((item) => ({
      productName: item.productName,
      variantLabel: item.variantLabel,
      priceInr: item.priceInr,
      rateDisplayMode: item.rateDisplayMode ?? "fixed",
      quantity: item.quantity,
      lineTotalInr: item.lineTotalInr
    }))
  });

  const finalEmailStatus = emailResult.ok ? "sent" : "failed";

  if (!emailResult.ok) {
    console.error(
      JSON.stringify({
        event: "checkout_email_failed",
        orderId: created.order.id,
        orderNumber: created.order.orderNumber,
        storeSlug,
        error: emailResult.error
      })
    );
  }

  await admin
    .from("orders")
    .update({
      email_status: finalEmailStatus,
      email_error: emailResult.ok ? null : emailResult.error
    })
    .eq("id", created.order.id);

  console.info(
    JSON.stringify({
      event: "checkout_order_created",
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      storeSlug,
      totalInr: created.order.totalInr,
      emailStatus: finalEmailStatus
    })
  );

  return Response.json(
    {
      order: {
        id: created.order.id,
        orderNumber: created.order.orderNumber,
        totalInr: created.order.totalInr,
        status: created.order.status,
        emailStatus: finalEmailStatus
      }
    },
    { status: 201 }
  );
}

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
  const website =
    typeof payload.customer?.website === "string" ? payload.customer.website.trim() : "";

  if (!storeSlug) return { ok: false, error: "Store is required." };
  if (website) return { ok: false, error: "Checkout could not be accepted." };
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

function mapOrderRpcError(message: string) {
  if (message.includes("STORE_UNAVAILABLE")) {
    return { message: "Store is not available.", status: 404 };
  }

  if (message.includes("PHONE_VERIFICATION_REQUIRED")) {
    return { message: "Phone verification is required before checkout.", status: 403 };
  }

  if (message.includes("CART_ITEM_UNAVAILABLE")) {
    return { message: "One or more cart items are currently unavailable.", status: 400 };
  }

  if (
    message.includes("INVALID_") ||
    message.includes("CART_EMPTY") ||
    message.includes("CART_TOO_LARGE") ||
    message.includes("DUPLICATE_CART_ITEM")
  ) {
    return { message: "Checkout details are invalid.", status: 400 };
  }

  return { message: "Order could not be saved.", status: 500 };
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = checkoutAttempts.get(key);

  if (!current || current.resetAt <= now) {
    checkoutAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true as const };
  }

  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { ok: false as const, resetAt: current.resetAt };
  }

  current.count += 1;
  checkoutAttempts.set(key, current);

  return { ok: true as const };
}
