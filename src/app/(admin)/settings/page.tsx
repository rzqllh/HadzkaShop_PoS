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
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage shop information, tax rates, and receipt configuration.
        </p>
      </div>
      <SettingsForm shop={{ ...shop, taxRate: Number(shop.taxRate) }} />
    </div>
  );
}
