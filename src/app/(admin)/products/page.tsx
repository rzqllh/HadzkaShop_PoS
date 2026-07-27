import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProductsClient } from "./products-client";
import { api, HydrateClient } from "@/trpc/server";

export default async function ProductsPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  await api.categories.getAll.prefetch();
  await api.products.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Produk</h1>
            <p className="text-base text-muted-foreground mt-2">
              Kelola daftar produk, harga, dan SKU.
            </p>
          </div>
        </div>
        <ProductsClient />
      </div>
    </HydrateClient>
  );
}
