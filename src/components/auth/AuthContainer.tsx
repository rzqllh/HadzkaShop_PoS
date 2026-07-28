"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Storefront } from "@phosphor-icons/react";

interface AuthContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  leftImage?: string;
}

export function AuthContainer({ children, title, subtitle, leftImage = "/images/pos_login_bg_emerald.png" }: AuthContainerProps) {
  const bgImage = "/images/auth-gradient.jpg";

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-primary/30">
      {/* Blurred Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <Image
          src={bgImage}
          alt="Background"
          fill
          className="object-cover scale-105 opacity-80"
          priority
        />
        {/* WCAG Contrast Update: Make the backdrop darker in dark mode, lighter in light mode for text readability */}
        <div className="absolute inset-0 bg-white/30 dark:bg-black/60 backdrop-blur-xl backdrop-saturate-150" />
      </div>

      <div className="w-full max-w-[1200px] min-h-[700px] rounded-[40px] flex p-4 relative z-10 
        bg-white/60 dark:bg-black/50 backdrop-blur-md shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden">
        
        {/* Left Image Area (Hidden on Mobile) */}
        <div className="hidden lg:block relative w-1/2 h-full min-h-[660px] rounded-[32px] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={leftImage}
              alt="POS Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </motion.div>
          
          <div className="absolute bottom-12 left-10 z-10 text-white space-y-2 pr-8">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-3xl font-bold tracking-tight text-white drop-shadow-sm"
            >
              Hadzka POS
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-base text-white/90 max-w-sm drop-shadow-sm font-medium"
            >
              Sistem point of sale modern untuk mengelola bisnis Anda dengan lebih efisien dan elegan.
            </motion.p>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full max-w-[400px] space-y-8 flex flex-col items-center"
          >
            
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-3 w-full">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-2 shadow-inner border border-white/30 dark:border-white/10 backdrop-blur-md">
                <Storefront size={28} weight="duotone" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {subtitle}
              </p>
            </div>

            {/* Form Content */}
            {children}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
