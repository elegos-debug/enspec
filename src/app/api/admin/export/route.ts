import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createAdminClient();
  const { data, error } = await service
    .from("attendees")
    .select("full_name,phone,email,filiere,academic_year,invitation_id,registered_at,attendance_status")
    .order("registered_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };
  const headers = ["full_name", "phone", "email", "filiere", "academic_year", "invitation_id", "registered_at", "attendance_status"];
  const rows = [headers.join(","), ...(data || []).map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))];
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="enspec-attendees.csv"',
    },
  });
}
