export const requiredSupabaseEnv = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_JWKS_URL"
] as const;

export function getMissingSupabaseEnv() {
  return requiredSupabaseEnv.filter((name) => !process.env[name]);
}
