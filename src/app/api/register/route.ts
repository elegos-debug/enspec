import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { registrationSchema, normalizePhone } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvitationPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("register_attendee", {
      p_full_name: input.fullName,
      p_phone: normalizePhone(input.phone),
      p_email: input.email,
      p_filiere: input.filiere,
      p_academic_year: input.academicYear,
      p_ip_hash: ipHash,
    });
    if (error) throw error;

    const result = data as {
      ok: boolean;
      code?: string;
      attendee?: { full_name: string; invitation_id: string };
    };
    if (!result.ok) {
      const messages: Record<string, string> = {
        duplicate_email: "This email address is already registered.",
        duplicate_phone: "This phone number is already registered.",
        duplicate: "You are already registered.",
        capacity: "Registration is closed because all 200 seats have been booked.",
        rate_limited: "Too many attempts. Please try again later.",
        invalid: "Please check all required fields.",
      };
      const status = result.code === "capacity" ? 409 : result.code === "rate_limited" ? 429 : 409;
      return NextResponse.json({ ok: false, code: result.code, message: messages[result.code || ""] || "Registration could not be completed." }, { status });
    }

    const attendee = result.attendee!;
    const bytes = await generateInvitationPdf({
      fullName: attendee.full_name,
      invitationId: attendee.invitation_id,
    });
    return NextResponse.json({
      ok: true,
      message: "Registration confirmed!",
      attendee,
      pdfBase64: Buffer.from(bytes).toString("base64"),
      filename: `${attendee.invitation_id}.pdf`,
    });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ ok: false, message: "A server error occurred. Please try again." }, { status: 500 });
  }
}
