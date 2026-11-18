export function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:")
      throw new Error("Supabase URL must use HTTP or HTTPS.");

    const host = url.host;
    if (!host.endsWith(".supabase.co"))
      throw new Error("Supabase URL must point to a *.supabase.co project.");

    return `https://${host}`;
  } catch {
    return null;
  }
}
