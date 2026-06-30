export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return Response.json({ error: "Missing public Supabase config." }, { status: 500 });
  }

  return Response.json({
    supabaseUrl,
    supabasePublishableKey
  });
}
