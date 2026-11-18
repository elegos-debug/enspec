"use client";

import Image from "next/image";
import { useState } from "react";
import { eventConfig } from "@/lib/config";
import { registrationSchema } from "@/lib/validation";

type Props = { initialCount: number; initialAvailable: boolean };
type FieldErrors = Partial<Record<"fullName" | "phone" | "email" | "filiere" | "academicYear", string[]>>;

export default function RegistrationPage({ initialCount, initialAvailable }: Props) {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(initialAvailable);
  const [count, setCount] = useState(initialCount);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<{ name: string; id: string; pdfBase64: string; filename: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage("");
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const values = {
      fullName: String(form.get("fullName") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      filiere: String(form.get("filiere") || ""),
      academicYear: String(form.get("academicYear") || ""),
    };
    const parsed = registrationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.code === "capacity") setAvailable(false);
        setMessage(data.message || "Registration could not be completed.");
        return;
      }
      setCount((current) => current + 1);
      setSuccess({
        name: data.attendee.full_name,
        id: data.attendee.invitation_id,
        pdfBase64: data.pdfBase64,
        filename: data.filename,
      });
    } catch {
      setMessage("The network is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!success) return;
    const bytes = Uint8Array.from(atob(success.pdfBase64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = success.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const remaining = Math.max(0, eventConfig.capacity - count);
  const percent = Math.min(100, Math.round((count / eventConfig.capacity) * 100));

  return (
    <main className="event-shell">
      <div className="mx-auto min-h-screen max-w-[1450px] px-4 py-5 sm:px-8 lg:px-12">
        <header className="gold-border mb-5 flex items-center justify-between rounded-sm px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3 sm:gap-5">
            <Image src="/ade.svg" alt="ADE" width={74} height={34} className="hidden h-8 w-auto sm:block" />
            <Image src="/enset.svg" alt="ENSET Mohammedia" width={150} height={42} className="h-9 w-auto sm:h-10" />
          </div>
          <Image src="/enspec.svg" alt="ENSPEC" width={54} height={54} className="h-12 w-12 rounded-xl sm:h-14 sm:w-14" />
        </header>

        <section className="gold-border relative grid min-h-[720px] overflow-hidden rounded-sm lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10 flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
            <div>
              <p className="mb-5 text-xs font-bold tracking-[.32em] text-[#efa927]">THE OFFICIAL CLUB KICKOFF</p>
              <h1 className="text-[4.2rem] font-black leading-[.82] tracking-tight text-[#efa927] sm:text-[6.2rem] lg:text-[7.3rem]">
                KICK-OFF
                <span className="mt-2 block text-[#f8f4eb]">EVENT</span>
              </h1>
              <p className="mt-7 font-serif text-3xl italic leading-tight text-[#f8f4eb] sm:text-5xl">
                Let&apos;s English
                <span className="block">Together!</span>
              </p>
            </div>

            <div className="mt-10 grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="gold-border rounded-xl px-5 py-4">
                <p className="text-[11px] font-bold tracking-widest text-[#efa927]">DATE</p>
                <p className="mt-1 text-sm font-bold sm:text-base">{eventConfig.dateLabel}</p>
              </div>
              <div className="gold-border rounded-xl px-5 py-4">
                <p className="text-[11px] font-bold tracking-widest text-[#efa927]">LOCATION</p>
                <p className="mt-1 text-sm font-bold sm:text-base">{eventConfig.location}</p>
                <p className="mt-1 text-xs text-slate-300">{eventConfig.timeLabel}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-4 mb-4 flex items-center lg:mx-0 lg:mb-0 lg:pr-8">
            <div className="absolute inset-y-10 right-[-80px] hidden w-[390px] rounded-full bg-[#efa927]/5 blur-3xl lg:block" />
            {success ? (
              <div className="gold-border relative z-10 w-full rounded-2xl bg-[#11172f]/95 p-7 text-center sm:p-10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#efa927] text-3xl text-[#efa927]">✓</div>
                <p className="text-xs font-bold tracking-[.25em] text-[#efa927]">REGISTRATION CONFIRMED</p>
                <h2 className="mt-3 text-3xl font-bold">Welcome, {success.name}</h2>
                <p className="mt-3 text-sm text-slate-300">Your personalized invitation is ready.</p>
                <div className="my-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-400">Registration ID</span>
                  <strong className="mt-1 block break-all text-[#efa927]">{success.id}</strong>
                </div>
                <button onClick={downloadPdf} className="w-full rounded-xl bg-[#efa927] px-5 py-4 font-black text-[#090e24] transition hover:bg-[#ffc45d]">
                  Download Invitation PDF
                </button>
              </div>
            ) : (
              <div className="gold-border relative z-10 w-full rounded-2xl bg-[#11172f]/95 p-5 sm:p-8">
                <p className="text-xs font-bold tracking-[.25em] text-[#efa927]">RESERVE YOUR SEAT</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Registration</h2>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-slate-300">
                    <span>{count} registered</span><span>{remaining} seats remaining</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-[#efa927]" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                {!available ? (
                  <div className="mt-7 rounded-xl border border-red-400/40 bg-red-400/10 p-5 text-red-100">
                    <strong>Registration is closed</strong>
                    <p className="mt-2 text-sm">All 200 seats have been reserved.</p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="mt-6 space-y-4">
                    <div>
                      <label className="label" htmlFor="fullName">Full name</label>
                      <input className={`field ${errors.fullName ? "field-error" : ""}`} id="fullName" name="fullName" autoComplete="name" placeholder="Your full name" />
                      {errors.fullName && <p className="mt-1 text-xs text-red-300">{errors.fullName[0]}</p>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="phone">Phone number</label>
                        <input className={`field ${errors.phone ? "field-error" : ""}`} id="phone" name="phone" autoComplete="tel" placeholder="+212 6..." />
                        {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone[0]}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="email">Email address</label>
                        <input className={`field ${errors.email ? "field-error" : ""}`} id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" />
                        {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email[0]}</p>}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="filiere">Filière</label>
                        <select className={`field ${errors.filiere ? "field-error" : ""}`} id="filiere" name="filiere" defaultValue="">
                          <option value="" disabled>Select filière</option>
                          {eventConfig.filieres.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {errors.filiere && <p className="mt-1 text-xs text-red-300">{errors.filiere[0]}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="academicYear">Academic year</label>
                        <select className={`field ${errors.academicYear ? "field-error" : ""}`} id="academicYear" name="academicYear" defaultValue="">
                          <option value="" disabled>Select year</option>
                          {eventConfig.academicYears.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {errors.academicYear && <p className="mt-1 text-xs text-red-300">{errors.academicYear[0]}</p>}
                      </div>
                    </div>
                    {message && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p>}
                    <button disabled={loading} className="mt-2 w-full rounded-xl bg-[#efa927] px-5 py-4 font-black text-[#090e24] transition hover:bg-[#ffc45d] disabled:cursor-not-allowed disabled:opacity-60">
                      {loading ? "Confirming registration..." : "Register & Get Invitation"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
