import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const shopId = session.user.shopId;

  const [productCount, lowStockCount, todayTxCount, openTill] = await Promise.all([
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
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.tillSession.findFirst({
      where: { shopId, status: "OPEN" },
      select: { openedAt: true, cashier: { select: { name: true } } },
    }),
  ]);

  // Today's revenue
  const todayRevenue = await prisma.transaction.aggregate({
    where: {
      shopId,
      status: "COMPLETED",
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    _sum: { total: true },
  });

  const revenue = Number(todayRevenue._sum.total ?? 0);

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  const stats = [
    { label: "Pendapatan Hari Ini", value: formatIDR(revenue), mono: true },
    { label: "Transaksi Hari Ini", value: todayTxCount.toString(), mono: true },
    { label: "Produk Aktif", value: productCount.toString(), mono: true },
    {
      label: "Status Kasir",
      value: openTill ? `Buka · ${openTill.cashier.name}` : "Tutup",
      warn: !openTill,
      mono: false,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="text-base text-muted-foreground mt-1">
          Ringkasan untuk {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold tracking-tight ${s.mono ? "font-price" : ""} ${s.warn ? "text-destructive" : ""}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-base text-muted-foreground">
          Riwayat transaksi dan laporan lebih detail akan muncul di sini (Fase 4.3–4.5).
        </p>
      </div>
    </div>
  );
}
