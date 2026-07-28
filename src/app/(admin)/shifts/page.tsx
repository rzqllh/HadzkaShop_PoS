import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "@/trpc/server";
import { ShiftsClient } from "./shifts-client";

export default async function ShiftsPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  await api.shifts.getAll.prefetch();

  return (
    <HydrateClient>
      <ShiftsClient />
    </HydrateClient>
  );
}
