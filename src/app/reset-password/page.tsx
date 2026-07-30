"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthContainer } from "@/components/auth/AuthContainer";
import { createClient } from "@/lib/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError("Link pemulihan tidak valid atau sudah kedaluwarsa.");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <AuthContainer
      title="Reset Password"
      subtitle="Buat password baru untuk akun Anda."
    >
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Password baru"
          className="h-12 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/10 dark:bg-black/50"
        />
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Ulangi password baru"
          className="h-12 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/10 dark:bg-black/50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-xl bg-primary font-medium text-primary-foreground disabled:opacity-60"
        >
          {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </AuthContainer>
  );
}
