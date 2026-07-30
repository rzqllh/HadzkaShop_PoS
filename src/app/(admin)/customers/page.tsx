import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CustomersClient } from "./customers-client";
import { api, HydrateClient } from "@/trpc/server";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.shopId) redirect("/login");
  
  await api.customers.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pelanggan</h1>
            <p className="text-base text-muted-foreground mt-2">
              Kelola data pelanggan, riwayat struk, dan poin loyalitas.
            </p>
          </div>
        </div>
        <CustomersClient />
      </div>
    </HydrateClient>
  );
}
