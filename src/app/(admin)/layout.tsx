import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { auth } from "@/auth";
import { PageTransition } from "@/components/page-transition";
import { AICopilot } from "@/components/pos/ai-copilot";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/pos");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminNav />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <AICopilot />
    </div>
  );
}
