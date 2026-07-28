import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CategoriesClient } from "./categories-client";
import { api, HydrateClient } from "@/trpc/server";

export default async function CategoriesPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  await api.categories.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Kategori</h1>
            <p className="text-base text-muted-foreground mt-2">
              Kelola kategori produk untuk toko Anda.
            </p>
          </div>
        </div>
        <CategoriesClient />
      </div>
    </HydrateClient>
  );
}
