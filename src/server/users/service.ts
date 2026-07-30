import { Prisma, type PrismaClient, type Role } from "@/generated/prisma/client";

export interface AuthAdminGateway {
  createUser(input: {
    email: string;
    password: string;
  }): Promise<{ user: { id: string } }>;
  deleteUser(id: string): Promise<void>;
  updateUserById(
    id: string,
    attributes: {
      email?: string;
      password?: string;
      banDuration?: string;
    },
  ): Promise<void>;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function assertOwner(
  db: PrismaClient,
  actorId: string,
  shopId: string,
) {
  const owner = await db.user.findFirst({
    where: { id: actorId, shopId, role: "OWNER", isActive: true },
    select: { id: true },
  });
  if (!owner) throw new Error("Hanya owner aktif yang dapat mengelola pengguna");
}

export async function createStaffWithDatabase(
  db: PrismaClient,
  admin: AuthAdminGateway,
  request: {
    actorId: string;
    shopId: string;
    input: {
      name: string;
      email: string;
      password: string;
      role: Role;
    };
  },
) {
  await assertOwner(db, request.actorId, request.shopId);
  const email = normalizeEmail(request.input.email);
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new Error("Email sudah digunakan");

  const authUser = await admin.createUser({
    email,
    password: request.input.password,
  });

  try {
    return await db.user.create({
      data: {
        shopId: request.shopId,
        authUserId: authUser.user.id,
        name: request.input.name.trim(),
        email,
        role: request.input.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (databaseError) {
    try {
      await admin.deleteUser(authUser.user.id);
    } catch (compensationError) {
      throw new AggregateError(
        [databaseError, compensationError],
        "Pembuatan user database gagal dan Auth user perlu direkonsiliasi",
      );
    }
    throw databaseError;
  }
}

async function lockShop(tx: Prisma.TransactionClient, shopId: string) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "Shop"
    WHERE "id" = ${shopId}
    FOR UPDATE
  `);
}

export async function updateUserProfileWithDatabase(
  db: PrismaClient,
  input: {
    actorId: string;
    shopId: string;
    userId: string;
    name: string;
    role: Role;
  },
) {
  return db.$transaction(async (tx) => {
    await lockShop(tx, input.shopId);
    const [actor, target] = await Promise.all([
      tx.user.findFirst({
        where: {
          id: input.actorId,
          shopId: input.shopId,
          role: "OWNER",
          isActive: true,
        },
      }),
      tx.user.findFirst({
        where: { id: input.userId, shopId: input.shopId, isActive: true },
      }),
    ]);
    if (!actor) throw new Error("Hanya owner aktif yang dapat mengelola pengguna");
    if (!target) throw new Error("Pengguna tidak ditemukan");

    if (target.role === "OWNER" && input.role !== "OWNER") {
      const ownerCount = await tx.user.count({
        where: { shopId: input.shopId, role: "OWNER", isActive: true },
      });
      if (ownerCount <= 1) throw new Error("Owner terakhir tidak dapat didemote");
    }

    return tx.user.update({
      where: { id: target.id },
      data: { name: input.name.trim(), role: input.role },
      select: { id: true, name: true, email: true, role: true },
    });
  });
}

export async function updateUserEmailWithDatabase(
  db: PrismaClient,
  admin: AuthAdminGateway,
  input: {
    actorId: string;
    shopId: string;
    userId: string;
    email: string;
  },
) {
  await assertOwner(db, input.actorId, input.shopId);
  const target = await db.user.findFirst({
    where: { id: input.userId, shopId: input.shopId, isActive: true },
  });
  if (!target?.authUserId) throw new Error("Pengguna belum terhubung ke Supabase Auth");

  const email = normalizeEmail(input.email);
  if (email === target.email) return target;
  const duplicate = await db.user.findUnique({ where: { email } });
  if (duplicate) throw new Error("Email sudah digunakan");

  await admin.updateUserById(target.authUserId, { email });
  try {
    return await db.user.update({
      where: { id: target.id },
      data: { email },
    });
  } catch (databaseError) {
    try {
      await admin.updateUserById(target.authUserId, { email: target.email });
    } catch (compensationError) {
      throw new AggregateError(
        [databaseError, compensationError],
        "Update email perlu direkonsiliasi",
      );
    }
    throw databaseError;
  }
}

export async function updateUserPassword(
  db: PrismaClient,
  admin: AuthAdminGateway,
  input: {
    actorId: string;
    shopId: string;
    userId: string;
    password: string;
  },
) {
  await assertOwner(db, input.actorId, input.shopId);
  const target = await db.user.findFirst({
    where: { id: input.userId, shopId: input.shopId, isActive: true },
    select: { authUserId: true },
  });
  if (!target?.authUserId) throw new Error("Pengguna belum terhubung ke Supabase Auth");
  await admin.updateUserById(target.authUserId, { password: input.password });
}

export async function deactivateUserWithDatabase(
  db: PrismaClient,
  admin: AuthAdminGateway,
  input: {
    actorId: string;
    shopId: string;
    userId: string;
  },
) {
  const target = await db.$transaction(async (tx) => {
    await lockShop(tx, input.shopId);
    const [actor, user] = await Promise.all([
      tx.user.findFirst({
        where: {
          id: input.actorId,
          shopId: input.shopId,
          role: "OWNER",
          isActive: true,
        },
      }),
      tx.user.findFirst({
        where: { id: input.userId, shopId: input.shopId, isActive: true },
      }),
    ]);
    if (!actor) throw new Error("Hanya owner aktif yang dapat mengelola pengguna");
    if (!user?.authUserId) throw new Error("Pengguna tidak ditemukan atau belum terhubung ke Auth");
    if (user.id === actor.id) throw new Error("Akun sendiri tidak dapat dinonaktifkan");

    if (user.role === "OWNER") {
      const ownerCount = await tx.user.count({
        where: { shopId: input.shopId, role: "OWNER", isActive: true },
      });
      if (ownerCount <= 1) throw new Error("Owner terakhir tidak dapat dinonaktifkan");
    }

    await tx.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    return user;
  });

  try {
    await admin.updateUserById(target.authUserId!, {
      banDuration: "876000h",
    });
  } catch (authError) {
    await db.user.update({
      where: { id: target.id },
      data: { isActive: true },
    });
    throw authError;
  }
}
