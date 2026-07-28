"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/pos";
  const errorParam = searchParams.get("error");
  const [errorMsg, setErrorMsg] = useState(errorParam);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  const handleSocialClick = () => {
    toast.info("Fitur login sosial belum tersedia.");
  };

  return (
    <AuthContainer
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
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
              {errorMsg === "SessionRequired" ? "Silakan login untuk melanjutkan." : errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-4">
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
                autoComplete="current-password"
                required
                placeholder="Password"
                className="w-full h-12 px-4 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-5 h-5 rounded border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 py-6 opacity-60">
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
        </div>

        <div className="w-full space-y-3">
          <button 
            type="button"
            onClick={handleSocialClick}
            className="w-full h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
          >
            <FcGoogle className="w-5 h-5" />
            Sign in with Google
          </button>
          <button 
            type="button"
            onClick={handleSocialClick}
            className="w-full h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
          >
            <FaApple className="w-5 h-5 text-black dark:text-white" />
            Sign in with Apple
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AuthContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
