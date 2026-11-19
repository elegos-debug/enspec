import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ message: "Request is too large." }, { status: 413 });
  const body = await (() => {
    try {
      return Promise.resolve(JSON.parse(raw));
    } catch {
      return Promise.resolve(null);
    }
  })();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        { message: "Invalid administrator email or password." },
        { status: 401 },
      );
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json({ message: "The administrator session could not be created." }, { status: 401 });
    }

    const service = createAdminClient();
    const { data: admin, error: adminError } = await service
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminError) {
      console.error("Admin authorization lookup failed", adminError);
      const code = typeof adminError.code === "string" ? adminError.code : "unknown";
      const hint =
        code === "42P01" || code === "PGRST205"
          ? " The public.admins table is missing; run supabase/schema.sql."
          : " Check the admins RLS policy and SUPABASE environment variables.";
      return NextResponse.json(
        { message: `Administrator authorization could not be verified (${code}).${hint}` },
        { status: 500 },
      );
    }
    if (!admin) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: "Your account is valid, but it is not authorized in public.admins." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ message: "A server error occurred during administrator login." }, { status: 500 });
  }
}
