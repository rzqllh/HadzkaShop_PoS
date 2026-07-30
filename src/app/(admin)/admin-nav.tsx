"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ChartLineUp,
  Receipt,
  Package,
  ListDashes,
  Gear,
  Storefront,
  SignOut,
  Users,
  UserList,
  CaretLeft,
  ClipboardText,
  Moon,
  Sun,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "Ringkasan", icon: ChartLineUp },
  { href: "/transactions", label: "Riwayat Transaksi", icon: Receipt },
  { href: "/customers", label: "Pelanggan", icon: UserList },
  { href: "/stock-movements", label: "Log Mutasi Stok", icon: ClipboardText },
  { href: "/products", label: "Daftar Produk", icon: Package },
  { href: "/categories", label: "Kategori", icon: ListDashes },
  { href: "/users", label: "Pengguna", icon: Users },
  { href: "/settings", label: "Pengaturan", icon: Gear },
];

const subscribeToHydration = () => () => undefined;

export function AdminNav() {
  const pathname = usePathname();
  const { data: lowStockCount } = api.products.getLowStockCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30s
  });

  const { theme, setTheme } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return (
    <TooltipProvider delay={0}>
      <aside 
        className={`flex-shrink-0 border-r border-border bg-sidebar flex flex-col h-full transition-all duration-300 ${
          isMinimized ? "w-20" : "w-64"
        }`}
      >
        {/* Wordmark & Toggle */}
        <div className="px-4 py-6 border-b border-sidebar-border flex items-center justify-between overflow-hidden">
          {!isMinimized && (
            <div className="whitespace-nowrap opacity-100 transition-opacity duration-300 w-full pl-2">
              <span className="font-semibold text-lg tracking-tight block">Hadzka POS</span>
              <span className="block text-sm text-muted-foreground mt-1">Owner Panel</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMinimized(!isMinimized)}
            className={`flex-shrink-0 ${isMinimized ? "mx-auto w-12 h-12 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" : ""}`}
            title="Toggle Sidebar"
          >
            {isMinimized ? <Storefront size={28} weight="duotone" /> : <CaretLeft size={20} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 ${isMinimized ? "justify-center px-0" : "px-4"} py-3 rounded-md text-base font-medium transition-colors touch-target whitespace-nowrap ${
                  active
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-sidebar-primary rounded-md"
                    transition={{ type: "tween", ease: "circOut", duration: 0.35 }}
                  />
                )}
                <item.icon size={24} weight="duotone" className="flex-shrink-0 relative z-10" />
                {!isMinimized && <span className="relative z-10">{item.label}</span>}
                
                {/* Badge if not minimized */}
                {!isMinimized && item.href === "/products" && lowStockCount !== undefined && lowStockCount > 0 && (
                  <Badge variant="destructive" className="ml-auto flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold">
                    {lowStockCount}
                  </Badge>
                )}
                {/* Badge indicator if minimized */}
                {isMinimized && item.href === "/products" && lowStockCount !== undefined && lowStockCount > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Link>
            );

            if (isMinimized) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={<div className="relative" />}>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.href === "/products" && lowStockCount !== undefined && lowStockCount > 0 && (
                      <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                        {lowStockCount}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return navLink;
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border flex flex-col gap-2 overflow-hidden">
          {isMinimized ? (
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Link
                  href="/pos"
                  className="flex items-center justify-center gap-3 px-0 py-3 rounded-md text-base font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors touch-target"
                >
                  <Storefront size={24} weight="duotone" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Buka Kasir</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/pos"
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-md text-base font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-target whitespace-nowrap"
            >
              <Storefront size={24} weight="duotone" className="flex-shrink-0" />
              Buka Kasir
            </Link>
          )}

          <div className={`grid gap-2 mt-1 ${isMinimized ? "grid-cols-1" : "grid-cols-2"}`}>
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center justify-center px-0 py-6 rounded-md text-base font-medium text-sidebar-foreground border-border/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors touch-target shadow-sm"
                >
                  {mounted && theme === "dark" ? <Sun size={24} weight="duotone" /> : <Moon size={24} weight="duotone" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Ganti Tema</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center justify-center px-0 py-6 rounded-md text-base font-medium text-destructive border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors touch-target shadow-sm"
                >
                  <SignOut size={24} weight="duotone" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Keluar</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
