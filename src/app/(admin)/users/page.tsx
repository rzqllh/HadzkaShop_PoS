import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";
import { api, HydrateClient } from "@/trpc/server";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  await api.users.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pengguna</h1>
            <p className="text-base text-muted-foreground mt-2">
              Kelola akun kasir dan owner toko.
            </p>
          </div>
        </div>
        <UsersClient />
      </div>
    </HydrateClient>
  );
}
