"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Administrator login failed.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("The login request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="event-shell flex min-h-screen items-center justify-center px-4">
      <form onSubmit={login} className="gold-border w-full max-w-md rounded-2xl bg-[#11172f]/95 p-7 sm:p-9">
        <p className="text-xs font-bold tracking-[.25em] text-[#efa927]">ENSPEC ADMIN</p>
        <h1 className="mt-2 text-3xl font-bold">Secure sign in</h1>
        {error && (
          <p role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="mt-7">
          <label className="label" htmlFor="email">Email</label>
          <input className="field" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="password">Password</label>
          <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-[#efa927] py-4 font-black text-[#090e24] disabled:opacity-60" type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
