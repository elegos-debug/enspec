import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Invalid administrator credentials.");
  redirect("/admin");
}

export default function AdminLoginPage() {
  return (
    <main className="event-shell flex min-h-screen items-center justify-center px-4">
      <form action={login} className="gold-border w-full max-w-md rounded-2xl bg-[#11172f]/95 p-7 sm:p-9">
        <p className="text-xs font-bold tracking-[.25em] text-[#efa927]">ENSPEC ADMIN</p>
        <h1 className="mt-2 text-3xl font-bold">Secure sign in</h1>
        <div className="mt-7">
          <label className="label" htmlFor="email">Email</label>
          <input className="field" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="password">Password</label>
          <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="mt-6 w-full rounded-xl bg-[#efa927] py-4 font-black text-[#090e24]" type="submit">Sign in</button>
      </form>
    </main>
  );
}
