"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/pos";
  const error = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Wordmark */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Hadzka POS</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Error */}
        {(error === "CredentialsSignin" || error === "SessionRequired") && (
          <div role="alert" className="rounded-md px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
            {error === "CredentialsSignin" ? "Invalid email or password." : "Please sign in to continue."}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              placeholder="owner@hadzkashop.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all touch-target"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
