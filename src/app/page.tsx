import RegistrationPage from "@/components/registration-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let count = 0;
  let available = true;

  try {
    const supabase = createAdminClient();
    const [{ count: registered, error: countError }, { data: settings }] = await Promise.all([
      supabase.from("attendees").select("id", { count: "exact", head: true }),
      supabase.from("event_settings").select("capacity").eq("id", true).maybeSingle(),
    ]);
    if (!countError) count = registered ?? 0;
    const capacity = settings?.capacity ?? eventConfig.capacity;
    available = count < capacity;
  } catch {
    // The form is still rendered; the database RPC remains the final authority.
  }

  return <RegistrationPage initialCount={count} initialAvailable={available} />;
}
