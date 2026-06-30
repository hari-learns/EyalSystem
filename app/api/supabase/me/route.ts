import { withSupabase } from "@supabase/server";

export const runtime = "nodejs";

export const GET = withSupabase({ auth: "user" }, async (_request, ctx) => {
  return Response.json({
    authMode: ctx.authMode,
    user: ctx.userClaims
  });
});
