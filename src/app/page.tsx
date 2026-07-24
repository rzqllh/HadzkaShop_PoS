import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "OWNER") {
    redirect("/dashboard");
  } else {
    redirect("/pos");
  }
}
