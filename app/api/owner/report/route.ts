import { withSupabase } from "@supabase/server";
import { getAdminUserContext, jsonError } from "@/lib/admin/auth";

export const runtime = "nodejs";

export const GET = withSupabase({ auth: "user" }, async (request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  if (!user.isOwner) {
    return jsonError("Owner access required.", 403);
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const range = getMonthRange(month);

  if (!range) {
    return jsonError("Invalid report month.", 400);
  }

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select("id, slug, name")
    .order("display_order", { ascending: true });

  if (storesError) {
    return jsonError("Could not load stores.", 500);
  }

  const { data: orders, error: ordersError } = await admin
    .from("orders")
    .select("id, store_id, status, total_inr")
    .gte("placed_at", range.start)
    .lt("placed_at", range.end);

  if (ordersError) {
    return jsonError("Could not load order report.", 500);
  }

  const { data: rules, error: rulesError } = await admin
    .from("commission_rules")
    .select("store_id, commission_type, value, is_active")
    .eq("is_active", true);

  if (rulesError) {
    return jsonError("Could not load commission rules.", 500);
  }

  const ruleByStore = new Map((rules ?? []).map((rule: any) => [rule.store_id, rule]));
  const ordersByStore = new Map<string, any[]>();

  for (const order of orders ?? []) {
    const current = ordersByStore.get(order.store_id) ?? [];
    current.push(order);
    ordersByStore.set(order.store_id, current);
  }

  return Response.json({
    month,
    stores: ((stores ?? []) as any[]).map((store) => {
      const storeOrders = ordersByStore.get(store.id) ?? [];
      const completedOrders = storeOrders.filter((order) => order.status === "completed");
      const completedValueInr = completedOrders.reduce(
        (sum, order) => sum + Number(order.total_inr),
        0
      );
      const rule = ruleByStore.get(store.id);
      const commissionDueInr = calculateCommission(rule, completedOrders.length, completedValueInr);

      return {
        id: store.id,
        slug: store.slug,
        name: store.name,
        submittedOrders: storeOrders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: storeOrders.filter((order) => order.status === "cancelled").length,
        completedValueInr,
        commissionDueInr
      };
    })
  });
});

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

function calculateCommission(rule: any, completedCount: number, completedValueInr: number) {
  if (!rule) return 0;

  if (rule.commission_type === "percentage") {
    return Math.round((completedValueInr * Number(rule.value)) / 100);
  }

  return Math.round(completedCount * Number(rule.value));
}
