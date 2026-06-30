# Supabase Server SDK

This project uses `@supabase/server` for server-side request handlers.

Required environment variables live in `.env.local` for local development and must be configured in deployment:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
```

Never commit `.env.local` or any secret key.

## Next.js Route Handler Pattern

Next.js route handlers use the standard Web `Request` and `Response` APIs, so `withSupabase` can be exported directly:

```ts
import { withSupabase } from "@supabase/server";

export const GET = withSupabase({ auth: "user" }, async (_request, ctx) => {
  const { data } = await ctx.supabase.from("orders").select();
  return Response.json(data);
});
```

Available clients:

- `ctx.supabase`: RLS-scoped client
- `ctx.supabaseAdmin`: admin client that bypasses RLS

Auth modes:

- `user`: valid JWT
- `publishable`: valid publishable key in `apikey`
- `secret`: valid secret key in `apikey`
- `none`: no credentials

The smoke-test route is available at:

```txt
/api/supabase/health
```

The JWT-protected route is available at:

```txt
/api/supabase/me
```

Call it with:

```bash
curl http://localhost:3000/api/supabase/me \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```
