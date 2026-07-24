import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const categories = await prisma.category.findMany({
    where: { shopId: session.user.shopId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organise your products into categories for quick filtering at the POS.
          </p>
        </div>
      </div>
      <CategoriesClient categories={categories} />
    </div>
  );
}
