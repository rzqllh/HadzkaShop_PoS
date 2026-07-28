"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Storefront, GoogleLogo, AppleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/client";

const bgImage = "/images/pos_login_bg_emerald.png";

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
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={bgImage}
              alt="POS Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          </motion.div>
          
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
              Kelola toko Anda dalam satu platform cerdas. Daftarkan bisnis Anda sekarang juga.
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
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Create an Account</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
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

            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full h-12 px-4 rounded-xl bg-background/50 dark:bg-background/30 backdrop-blur-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
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
                    className="w-full h-12 px-4 rounded-xl bg-background/50 dark:bg-background/30 backdrop-blur-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
                  />
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Input Password"
                    className="w-full h-12 px-4 rounded-xl bg-background/50 dark:bg-background/30 backdrop-blur-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" name="terms" className="peer sr-only" />
                    <div className="w-5 h-5 rounded border border-border bg-background/50 backdrop-blur-sm peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    I agree to the <a href="#" className="text-primary font-semibold hover:underline">Terms and Privacy policy</a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="w-full flex items-center gap-4 py-2 opacity-60">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="w-full space-y-3">
              <button 
                type="button"
                onClick={handleSocialClick}
                className="w-full h-12 rounded-xl bg-background/40 dark:bg-background/20 backdrop-blur-md border border-border text-foreground font-medium hover:bg-background/60 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
              >
                <GoogleLogo weight="bold" className="text-xl text-red-500" />
                Sign up with Google
              </button>
              <button 
                type="button"
                onClick={handleSocialClick}
                className="w-full h-12 rounded-xl bg-background/40 dark:bg-background/20 backdrop-blur-md border border-border text-foreground font-medium hover:bg-background/60 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
              >
                <AppleLogo weight="fill" className="text-xl text-foreground" />
                Sign up with Apple
              </button>
            </div>
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <RegisterForm />
    </Suspense>
  );
}
