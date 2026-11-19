import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/csv";

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

  const headers = ["full_name", "phone", "email", "filiere", "academic_year", "invitation_id", "registered_at", "attendance_status"];
  const rows: unknown[][] = [
    ["Full name", "Phone", "Email", "Filière", "Academic year", "Invitation ID", "Registered at (UTC)", "Attendance"],
    ...(data || []).map((row) => headers.map((header) => header === "registered_at"
      ? new Date(row[header as keyof typeof row] as string).toISOString()
      : row[header as keyof typeof row])),
  ];
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="enspec-attendees.csv"',
      "Cache-Control": "no-store",
    },
  });
}
