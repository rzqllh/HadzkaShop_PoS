import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { POSTerminal } from "./pos-terminal";

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

  return (
    <POSTerminal
      shop={{ ...shop, taxRate: Number(shop.taxRate) }}
      products={products.map((p) => ({
        ...p,
        price: Number(p.price),
        costPrice: p.costPrice ? Number(p.costPrice) : null,
      }))}
      categories={categories}
      customers={customers}
      cashierName={session.user.name ?? "Cashier"}
      cashierRole={session.user.role as string}
    />
  );
}
