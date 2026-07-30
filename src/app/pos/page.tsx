import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { POSTerminal } from "./pos-terminal";
import { qrisDisabledReason, qrisEnabled } from "@/server/config/features";
import Script from "next/script";

export default async function POSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const shopId = session.user.shopId;

  const [shop, products, categories, customers] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, taxRate: true, currency: true, lowStockThreshold: true },
    }),
    prisma.product.findMany({
      where: { shopId, isActive: true },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { shopId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.customer.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, loyaltyPoints: true },
    }),
  ]);

  if (!shop) redirect("/login");

  const snapScriptUrl =
    process.env.MIDTRANS_ENV === "production"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <>
      {qrisEnabled && (
        <Script
          src={snapScriptUrl}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      )}
      <POSTerminal
      shop={{ ...shop, taxRate: Number(shop.taxRate) }}
      products={products.map(({ reservedStock, ...product }) => ({
        ...product,
        stock: product.stock - reservedStock,
        price: Number(product.price),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      }))}
      categories={categories}
      customers={customers}
      cashierName={session.user.name ?? "Cashier"}
      cashierRole={session.user.role as string}
      qrisEnabled={qrisEnabled}
      qrisDisabledReason={qrisDisabledReason}
      />
    </>
  );
}
