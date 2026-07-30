import type { PrismaClient } from "@/generated/prisma/client";

export async function resolveAppIdentity(
  db: PrismaClient,
  authUserId: string,
) {
  return db.user.findFirst({
    where: {
      authUserId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      shopId: true,
    },
  });
}
