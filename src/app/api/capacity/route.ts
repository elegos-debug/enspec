import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [{ count, error: countError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabase.from("attendees").select("id", { count: "exact", head: true }),
        supabase.from("event_settings").select("capacity").eq("id", true).maybeSingle(),
      ]);

    if (countError || settingsError) {
      return NextResponse.json(
        { count: 0, capacity: eventConfig.capacity, available: true },
        { status: 200 },
      );
    }

    const registered = count ?? 0;
    const capacity = settings?.capacity ?? eventConfig.capacity;
    return NextResponse.json({
      count: registered,
      capacity,
      remaining: Math.max(0, capacity - registered),
      available: registered < capacity,
    });
  } catch {
    return NextResponse.json({
      count: 0,
      capacity: eventConfig.capacity,
      remaining: eventConfig.capacity,
      available: true,
    });
  }
}
