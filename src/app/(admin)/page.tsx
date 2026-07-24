import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminRoot() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/pos");
  redirect("/dashboard");
}
