import RegistrationPage from "@/components/registration-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let count = 0;
  let available = true;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createAdminClient();
      const { count: registered } = await supabase
        .from("attendees")
        .select("id", { count: "exact", head: true });
      count = registered ?? 0;
      available = count < eventConfig.capacity;
    } catch {
      // The form is still rendered; the database RPC remains the final authority.
    }
  }

  return <RegistrationPage initialCount={count} initialAvailable={available} />;
}
