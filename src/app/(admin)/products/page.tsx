import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductsClient } from "./products-client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; archived?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const params = await searchParams;
  const showArchived = params.archived === "1";

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId: session.user.shopId,
        isActive: !showArchived,
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: "insensitive" } },
                { sku: { contains: params.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(params.category ? { categoryId: params.category } : {}),
      },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.category.findMany({
      where: { shopId: session.user.shopId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showArchived ? "Archived products — restore to make them available at POS." : `${products.length} active product${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? "/products" : "/products?archived=1"}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showArchived ? "← Active products" : "View archived"}
          </Link>
        </div>
      </div>
      <ProductsClient
        products={products.map((p) => ({
          ...p,
          price: Number(p.price),
          costPrice: p.costPrice ? Number(p.costPrice) : null,
        }))}
        categories={categories}
        showArchived={showArchived}
      />
    </div>
  );
}
