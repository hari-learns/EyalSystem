import { withSupabase } from "@supabase/server";
import { getAdminUserContext, jsonError } from "@/lib/admin/auth";

export const runtime = "nodejs";

export const GET = withSupabase({ auth: "user" }, async (_request, ctx) => {
  const admin = ctx.supabaseAdmin as any;
  const { data: user, error } = await getAdminUserContext(ctx, admin);

  if (error || !user) {
    return jsonError(error ?? "Unauthorized.", 401);
  }

  return Response.json({ user });
});
