import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { SessionProvider } from "next-auth/react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/pos");

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AdminNav />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
