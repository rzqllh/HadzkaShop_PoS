import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/pos/stat-card";
import { Money, Receipt, Package, Bank, ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const shopId = session.user.shopId;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [productCount, lowStockCount, todayTxCount, openTill, todayRevenueObj, recentTxs, weekTxs, todayFullTxs] = await Promise.all([
    prisma.product.count({ where: { shopId, isActive: true } }),
    prisma.product.count({
      where: {
        shopId,
        isActive: true,
        stock: { lte: prisma.product.fields.lowStockThreshold as any },
      },
    }).catch(() => 0),
    prisma.transaction.count({
      where: { shopId, status: "COMPLETED", createdAt: { gte: today } },
    }),
    prisma.tillSession.findFirst({
      where: { shopId, status: "OPEN" },
      select: { openedAt: true, cashier: { select: { name: true } } },
    }),
    prisma.transaction.aggregate({
      where: { shopId, status: "COMPLETED", createdAt: { gte: today } },
      _sum: { total: true },
    }),
    prisma.transaction.findMany({
      where: { shopId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { cashier: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { shopId, status: "COMPLETED", createdAt: { gte: sevenDaysAgo } },
      select: { total: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { shopId, status: "COMPLETED", createdAt: { gte: today } },
      select: { 
        subtotal: true, 
        discountAmount: true, 
        items: { 
          select: { 
            costPrice: true, 
            quantity: true, 
            subtotal: true,
            product: { select: { name: true } } 
          } 
        } 
      }
    })
  ]);

  const revenue = Number(todayRevenueObj._sum.total ?? 0);
  
  let todayProfit = 0;
  const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const tx of todayFullTxs) {
    const cogs = tx.items.reduce((acc, item) => acc + (Number(item.costPrice || 0) * item.quantity), 0);
    const netRevenue = Number(tx.subtotal) - Number(tx.discountAmount);
    todayProfit += (netRevenue - cogs);

    for (const item of tx.items) {
      if (!item.product) continue;
      const existing = productSalesMap.get(item.product.name) || { name: item.product.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.subtotal);
      productSalesMap.set(item.product.name, existing);
    }
  }

  const topSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Calculate 7 days revenue map
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      revenue: 0,
    };
  });

  for (const tx of weekTxs) {
    const txDateStr = tx.createdAt.toISOString().split('T')[0];
    const day = last7Days.find((d) => d.date.toISOString().split('T')[0] === txDateStr);
    if (day) day.revenue += Number(tx.total);
  }
  
  const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="text-base text-muted-foreground mt-1">
          Ringkasan untuk {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <StatCard
            title="Pendapatan Hari Ini"
            value={formatIDR(revenue)}
            icon={<Money size={24} weight="duotone" />}
          />
        </div>
        <div>
          <StatCard
            title="Transaksi Hari Ini"
            value={todayTxCount.toString()}
            icon={<Receipt size={24} weight="duotone" />}
          />
        </div>
        <div>
          <StatCard
            title="Laba Hari Ini"
            value={formatIDR(todayProfit)}
            icon={<ChartLineUp size={24} weight="duotone" className="text-success" />}
          />
        </div>
        <div>
          <StatCard
            title="Produk Aktif"
            value={productCount.toString()}
            icon={<Package size={24} weight="duotone" />}
          />
        </div>
        <div>
          <StatCard
            title="Status Kasir"
            value={openTill ? `Buka · ${openTill.cashier.name}` : "Tutup"}
            icon={<Bank size={24} weight="duotone" className={openTill ? "text-success" : "text-destructive"} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Pendapatan 7 Hari Terakhir</h2>
          <div className="flex items-end gap-2 h-48 mt-8">
            {last7Days.map((day, i) => {
              const heightPct = Math.max((day.revenue / maxRevenue) * 100, 2);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex justify-center h-full items-end">
                    <div 
                      className="w-full max-w-12 bg-primary/20 hover:bg-primary transition-all duration-300 rounded-t-md relative"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap transition-opacity">
                        {formatIDR(day.revenue)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Transaksi Terbaru</h2>
          </div>
          <div className="flex-1 space-y-4">
            {recentTxs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Belum ada transaksi.</p>
            ) : (
              recentTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{tx.transactionNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • {tx.cashier.name}
                    </p>
                  </div>
                  <p className="font-semibold text-sm font-price">{formatIDR(Number(tx.total))}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Produk Terlaris Hari Ini</h2>
          </div>
          <div className="flex-1 space-y-4">
            {topSellingProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Belum ada penjualan hari ini.</p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.quantity} terjual</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm font-price">{formatIDR(p.revenue)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
