"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Storefront, GoogleLogo, AppleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

const bgImages = [
  "/images/login_bg_1_1785144659781.png",
  "/images/login_bg_2_1785144669507.png",
  "/images/login_bg_3_1785144678697.png",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/pos";
  const errorParam = searchParams.get("error");
  const [errorMsg, setErrorMsg] = useState(errorParam);
  const [isLoading, setIsLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-500/30">
      <div className="w-full max-w-[1200px] min-h-[700px] bg-white rounded-[40px] flex p-4 shadow-2xl relative overflow-hidden">
        
        {/* Left Image Area (Hidden on Mobile) */}
        <div className="hidden lg:block relative w-1/2 h-full min-h-[660px] rounded-[32px] overflow-hidden bg-zinc-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={bgIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={bgImages[bgIndex]}
                alt="POS Background"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </motion.div>
          </AnimatePresence>
          
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
              Sistem point of sale modern untuk mengelola bisnis Anda dengan lebih efisien dan elegan.
            </motion.p>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-zinc-950">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[400px] space-y-8 flex flex-col items-center"
          >
            
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-3 w-full">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                <Storefront size={28} weight="duotone" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Log In to POS</h1>
              <p className="text-sm font-medium text-zinc-500">
                Don&apos;t have an account? <Link href="/register" className="text-blue-600 hover:underline">Create an account</Link>
              </p>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full rounded-2xl px-4 py-3 text-sm font-medium bg-red-50 text-red-600 border border-red-100 text-center"
              >
                {errorMsg === "SessionRequired" ? "Silakan login untuk melanjutkan." : errorMsg}
              </motion.div>
            )}

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
                    className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-sm"
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
                    className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-5 h-5 rounded border border-zinc-300 bg-zinc-50 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-zinc-950 text-white font-medium shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Log In"}
              </button>
            </form>

            <div className="w-full flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-zinc-200"></div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Or</span>
              <div className="flex-1 h-px bg-zinc-200"></div>
            </div>

            <div className="w-full space-y-3">
              <button 
                type="button"
                onClick={handleSocialClick}
                className="w-full h-12 rounded-xl bg-white border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <GoogleLogo weight="bold" className="text-xl text-red-500" />
                Sign in with Google
              </button>
              <button 
                type="button"
                onClick={handleSocialClick}
                className="w-full h-12 rounded-xl bg-white border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <AppleLogo weight="fill" className="text-xl text-zinc-950" />
                Sign in with Apple
              </button>
            </div>
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
