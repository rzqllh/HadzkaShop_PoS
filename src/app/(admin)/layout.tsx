import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { createClient } from "@/lib/server";
import { prisma } from "@/lib/prisma";
import { PageTransition } from "@/components/page-transition";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) redirect("/login");

  const appUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!appUser || appUser.role !== "OWNER") redirect("/pos");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminNav />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
