import { createClient } from "@/lib/server";
import { prisma } from "@/lib/prisma";

export async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const appUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!appUser) return null;

  return {
    user: {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
      shopId: appUser.shopId,
    }
  };
}
