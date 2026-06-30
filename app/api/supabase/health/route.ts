import { withSupabase } from "@supabase/server";

export const runtime = "nodejs";

export const GET = withSupabase({ auth: "none" }, async (_request, ctx) => {
  return Response.json({
    ok: true,
    authMode: ctx.authMode,
    hasRlsScopedClient: Boolean(ctx.supabase),
    hasAdminClient: Boolean(ctx.supabaseAdmin)
  });
});
