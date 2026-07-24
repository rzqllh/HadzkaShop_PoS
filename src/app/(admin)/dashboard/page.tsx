import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/pos/stat-card";
import { Money, Receipt, Package, Bank } from "@phosphor-icons/react/dist/ssr";
import { PageTransition } from "@/components/ui/page-transition";

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const shopId = session.user.shopId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [productCount, lowStockCount, todayTxCount, openTill, todayRevenueObj] = await Promise.all([
    prisma.product.count({ where: { shopId, isActive: true } }),
    prisma.product.count({
      where: {
        shopId,
        isActive: true,
        stock: { lte: prisma.product.fields.lowStockThreshold as any },
      },
    }).catch(() => 0),
    prisma.transaction.count({
      where: {
        shopId,
        status: "COMPLETED",
        createdAt: { gte: today },
      },
    }),
    prisma.tillSession.findFirst({
      where: { shopId, status: "OPEN" },
      select: { openedAt: true, cashier: { select: { name: true } } },
    }),
    prisma.transaction.aggregate({
      where: {
        shopId,
        status: "COMPLETED",
        createdAt: { gte: today },
      },
      _sum: { total: true },
    }),
  ]);

  const revenue = Number(todayRevenueObj._sum.total ?? 0);

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <PageTransition className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="text-base text-muted-foreground mt-1">
          Ringkasan untuk {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatIDR(revenue)}
          icon={<Money size={24} weight="duotone" />}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={todayTxCount.toString()}
          icon={<Receipt size={24} weight="duotone" />}
        />
        <StatCard
          title="Produk Aktif"
          value={productCount.toString()}
          icon={<Package size={24} weight="duotone" />}
        />
        <StatCard
          title="Status Kasir"
          value={openTill ? `Buka · ${openTill.cashier.name}` : "Tutup"}
          icon={<Bank size={24} weight="duotone" className={openTill ? "text-success" : "text-destructive"} />}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-base text-muted-foreground">
          Riwayat transaksi dan laporan lebih detail akan muncul di sini (Fase 4.3–4.5).
        </p>
      </div>
    </PageTransition>
  );
}
