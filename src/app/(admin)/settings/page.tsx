import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { api, HydrateClient } from "@/trpc/server";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  await api.shop.getSettings.prefetch();

  return (
    <HydrateClient>
      <div className="p-6 h-full flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pengaturan Toko</h1>
          <p className="text-base text-muted-foreground mt-2">
            Kelola informasi toko, pajak, dan cetak struk.
          </p>
        </div>
        <SettingsForm />
      </div>
    </HydrateClient>
  );
}
