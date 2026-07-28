"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/client";
import { AuthContainer } from "@/components/auth/AuthContainer";

function ForgotPasswordForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      setIsSent(true);
      setIsLoading(false);
    }
  }

  return (
    <AuthContainer
      title="Forgot Password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
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

        {isSent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl p-6 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-center flex flex-col items-center gap-4 backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-emerald-700 dark:text-emerald-300">Check your email</h3>
              <p className="text-sm">We have sent a password recovery link to your email address.</p>
            </div>
            <Link 
              href="/login"
              className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline"
            >
              Return to Log in
            </Link>
          </motion.div>
        ) : (
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending link..." : "Send Reset Link"}
            </button>
            
            <div className="text-center pt-2">
              <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Log in
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthContainer>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
