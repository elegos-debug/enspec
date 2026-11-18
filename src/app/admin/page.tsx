import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventConfig } from "@/lib/config";

async function signOut() {
  "use server";
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

async function setAttendance(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!["registered", "present", "absent"].includes(status)) throw new Error("Invalid attendance status.");
  const service = createAdminClient();
  const { error } = await service.from("attendees").update({ attendance_status: status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filiere?: string; year?: string; sort?: string }>;
}) {
  const sessionSupabase = await createServerSupabase();
  const { data: { user } } = await sessionSupabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await sessionSupabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const supabase = createAdminClient();
  let query = supabase
    .from("attendees")
    .select("id,full_name,phone,email,filiere,academic_year,invitation_id,registered_at,attendance_status");

  if (params.filiere) query = query.eq("filiere", params.filiere);
  if (params.year) query = query.eq("academic_year", params.year);
  if (params.q) {
    const q = params.q.replace(/[%_,]/g, "");
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,filiere.ilike.%${q}%`);
  }
  query = query.order("registered_at", { ascending: params.sort !== "oldest" });

  const [{ data: attendees, error }, { count }] = await Promise.all([
    query,
    supabase.from("attendees").select("id", { count: "exact", head: true }),
  ]);
  if (error) throw error;

  const total = count ?? 0;
  const remaining = Math.max(0, eventConfig.capacity - total);
  const percent = Math.round((total / eventConfig.capacity) * 100);

  return (
    <main className="event-shell min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="gold-border flex items-center justify-between rounded-xl bg-[#11172f]/80 px-5 py-4">
          <div>
            <p className="text-xs font-bold tracking-[.25em] text-[#efa927]">ENSPEC</p>
            <h1 className="text-xl font-bold sm:text-2xl">Kickoff Admin Dashboard</h1>
          </div>
          <form action={signOut}><button className="rounded-lg border border-white/15 px-4 py-2 text-sm">Sign out</button></form>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Registrations", total],
            ["Remaining seats", remaining],
            ["Capacity", `${percent}%`],
          ].map(([label, value]) => (
            <div key={String(label)} className="gold-border rounded-xl bg-[#11172f]/80 p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-black text-[#efa927]">{value}</p>
            </div>
          ))}
        </section>

        <form className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-[#11172f]/80 p-4 md:grid-cols-[1fr_180px_180px_150px_auto]" method="get">
          <input className="field" name="q" defaultValue={params.q} placeholder="Search name, email, phone or filière" />
          <select className="field" name="filiere" defaultValue={params.filiere || ""}>
            <option value="">All filières</option>
            {eventConfig.filieres.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="field" name="year" defaultValue={params.year || ""}>
            <option value="">All years</option>
            {eventConfig.academicYears.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="field" name="sort" defaultValue={params.sort || "newest"}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <button className="rounded-lg bg-[#efa927] px-5 font-bold text-[#090e24]" type="submit">Filter</button>
        </form>

        <div className="mt-5 flex justify-end">
          <a className="rounded-lg border border-[#efa927]/50 px-4 py-2 text-sm font-bold text-[#efa927]" href="/api/admin/export">Export CSV</a>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#11172f]/80">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-4">Attendee</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Filière</th>
                <th className="px-4 py-4">Year</th>
                <th className="px-4 py-4">Registered</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(attendees || []).map((attendee) => (
                <tr key={attendee.id} className="border-b border-white/5">
                  <td className="px-4 py-4">
                    <strong>{attendee.full_name}</strong>
                    <p className="mt-1 max-w-[230px] truncate text-xs text-[#efa927]">{attendee.invitation_id}</p>
                  </td>
                  <td className="px-4 py-4"><p>{attendee.email}</p><p className="mt-1 text-slate-400">{attendee.phone}</p></td>
                  <td className="px-4 py-4">{attendee.filiere}</td>
                  <td className="px-4 py-4">{attendee.academic_year}</td>
                  <td className="px-4 py-4">{new Date(attendee.registered_at).toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <form action={setAttendance} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={attendee.id} />
                      <select className="field min-h-10 py-2" name="status" defaultValue={attendee.attendance_status}>
                        <option value="registered">Registered</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                      </select>
                      <button className="rounded-lg border border-[#efa927]/50 px-3 py-2 text-xs font-bold text-[#efa927]" type="submit">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(attendees || []).length === 0 && <p className="p-8 text-center text-slate-400">No registrations match this filter.</p>}
        </div>
      </div>
    </main>
  );
}
