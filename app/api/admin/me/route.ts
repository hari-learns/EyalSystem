import { withSupabase } from "@supabase/server";
import { getAdminUserContext, jsonError } from "@/lib/admin/auth";

export const runtime = "nodejs";

export const GET = withSupabase({ auth: "user" }, async (_request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  const storeSlugs = user.stores.map((store) => store.slug);
  const { data: stores, error: storesError } =
    storeSlugs.length > 0
      ? await admin
          .from("stores")
          .select("slug, merchant_order_email")
          .in("slug", storeSlugs)
      : { data: [], error: null };

  if (storesError) {
    return jsonError("Could not load merchant store settings.", 500);
  }

  const emailBySlug = new Map(
    ((stores ?? []) as any[]).map((store) => [store.slug, store.merchant_order_email])
  );

  return Response.json({
    user: {
      ...user,
      stores: user.stores.map((store) => ({
        ...store,
        merchantOrderEmail: emailBySlug.get(store.slug) ?? null
      }))
    },
    email: {
      fallbackConfigured: Boolean(process.env.ORDER_EMAIL_TO),
      fromConfigured: Boolean(process.env.ORDER_EMAIL_FROM)
    }
  });
});
