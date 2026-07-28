"use client";

import { useState, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Storefront } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/client";

const bgImage = "/images/pos_login_bg_emerald.png";

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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-primary/30">
      {/* Blurred Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={bgImage}
          alt="Background"
          fill
          className="object-cover scale-105"
          priority
        />
        <div className="absolute inset-0 bg-background/20 dark:bg-background/40 backdrop-blur-2xl backdrop-saturate-150" />
      </div>

      <div className="w-full max-w-[1200px] min-h-[700px] rounded-[40px] flex p-4 shadow-2xl relative z-10 
        bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 overflow-hidden">
        
        {/* Left Image Area (Hidden on Mobile) */}
        <div className="hidden lg:block relative w-1/2 h-full min-h-[660px] rounded-[32px] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          
          <div className="absolute bottom-12 left-10 z-10 text-white space-y-2 pr-8">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-3xl font-bold tracking-tight text-white"
            >
              Hadzka POS
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-base text-white/80 max-w-sm"
            >
              Lupa password? Jangan khawatir, kami akan membantu Anda memulihkan akses ke akun Anda.
            </motion.p>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-foreground">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full max-w-[400px] space-y-8 flex flex-col items-center"
          >
            
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-3 w-full">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-2 shadow-inner border border-white/20 dark:border-white/10 backdrop-blur-md">
                <Storefront size={28} weight="duotone" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Forgot Password</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full rounded-2xl px-4 py-3 text-sm font-medium bg-red-50 text-red-600 border border-red-100 text-center"
              >
                {errorMsg}
              </motion.div>
            )}

            {isSent ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full rounded-2xl p-6 bg-success/10 text-success border border-success/20 text-center flex flex-col items-center gap-4 backdrop-blur-md"
              >
                <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Check your email</h3>
                  <p className="text-sm text-success/80">We have sent a password recovery link to your email address.</p>
                </div>
                <Link 
                  href="/login"
                  className="mt-2 text-sm font-medium text-success hover:text-success/80 underline"
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
                        className="w-full h-12 px-4 rounded-xl bg-background/50 dark:bg-background/30 backdrop-blur-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
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
                  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Log in
                  </Link>
                </div>
              </form>
            )}
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
