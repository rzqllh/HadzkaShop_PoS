import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const shop = await prisma.shop.findUnique({
    where: { id: session.user.shopId },
  });

  if (!shop) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-base text-muted-foreground mt-2">
          Manage shop information, tax rates, and receipt configuration.
        </p>
      </div>
      <SettingsForm shop={{ ...shop, taxRate: Number(shop.taxRate) }} />
    </div>
  );
}
