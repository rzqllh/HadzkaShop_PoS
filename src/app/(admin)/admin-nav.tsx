"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

import {
  ChartLineUp,
  Receipt,
  Package,
  ListDashes,
  Gear,
  Storefront,
  SignOut,
  Users,
  Clock,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/dashboard", label: "Ringkasan", icon: ChartLineUp },
  { href: "/transactions", label: "Riwayat Transaksi", icon: Receipt },
  { href: "/products", label: "Daftar Produk", icon: Package },
  { href: "/categories", label: "Kategori", icon: ListDashes },
  { href: "/users", label: "Pengguna", icon: Users },
  { href: "/shifts", label: "Sesi Kasir", icon: Clock },
  { href: "/settings", label: "Pengaturan", icon: Gear },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: lowStockCount } = api.products.getLowStockCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30s
  });

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col h-full">
      {/* Wordmark */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <span className="font-semibold text-lg tracking-tight">Hadzka POS</span>
        <span className="block text-sm text-muted-foreground mt-1">Owner Panel</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors touch-target ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon size={24} weight="duotone" />
              {item.label}
              {item.href === "/products" && lowStockCount !== undefined && lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold">
                  {lowStockCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Link
          href="/pos"
          className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors touch-target"
        >
          <Storefront size={24} weight="duotone" />
          Buka Kasir
        </Link>
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-start gap-3 px-4 py-6 rounded-md text-base font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors touch-target"
        >
          <SignOut size={24} weight="duotone" />
          Keluar
        </Button>
      </div>
    </aside>
  );
}
