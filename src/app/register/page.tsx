"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/client";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

function RegisterForm() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    
    // Validate terms
    const terms = fd.get("terms");
    if (!terms) {
      setErrorMsg("Anda harus menyetujui Syarat dan Ketentuan.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      toast.success("Registrasi berhasil! Silakan periksa email Anda jika konfirmasi diaktifkan, atau langsung masuk.");
      router.push("/login");
    }
  }

  const handleSocialClick = () => {
    toast.info("Fitur registrasi sosial belum tersedia.");
  };

  return (
    <AuthContainer
      title="Create an Account"
      subtitle={
        <>
          Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </>
      }
    >
      <div className="w-full">
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium bg-red-50 text-red-600 border border-red-100 text-center mb-6"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-4">
            <div className="relative">
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Full Name"
                className="w-full h-12 px-4 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
              />
            </div>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                className="w-full h-12 px-4 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
              />
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                className="w-full h-12 px-4 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group mt-2">
            <div className="relative flex items-center mt-0.5">
              <input type="checkbox" name="terms" required className="peer sr-only" />
              <div className="w-5 h-5 rounded border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
              I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 py-6 opacity-60">
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Or register with</span>
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
        </div>

        <div className="w-full flex gap-3">
          <button 
            type="button"
            onClick={handleSocialClick}
            className="flex-1 h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            aria-label="Register with Google"
          >
            <FcGoogle className="w-6 h-6" />
          </button>
          <button 
            type="button"
            onClick={handleSocialClick}
            className="flex-1 h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm text-zinc-800 dark:text-zinc-200"
            aria-label="Register with Apple"
          >
            <FaApple className="w-6 h-6 text-black dark:text-white" />
          </button>
        </div>
      </div>
    </AuthContainer>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <RegisterForm />
    </Suspense>
  );
}
