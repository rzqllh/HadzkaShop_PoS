import { createClient } from "@/lib/server";
import { prisma } from "@/lib/prisma";
import { resolveAppIdentity } from "@/server/auth/identity";

export async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const appUser = await resolveAppIdentity(prisma, user.id);
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
