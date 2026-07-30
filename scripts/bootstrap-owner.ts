import { prisma } from "../src/lib/prisma";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";
import { normalizeEmail } from "../src/server/users/service";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} wajib diisi`);
  return value;
}

async function findAuthUserByEmail(email: string) {
  const admin = createSupabaseAdminClient().auth.admin;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 1_000 });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email && normalizeEmail(candidate.email) === email,
    );
    if (user) return user;
    if (data.users.length < 1_000) return null;
  }
}

async function main() {
  const email = normalizeEmail(required("BOOTSTRAP_OWNER_EMAIL"));
  const password = required("BOOTSTRAP_OWNER_PASSWORD");
  const name = required("BOOTSTRAP_OWNER_NAME").trim();
  if (password.length < 8) throw new Error("BOOTSTRAP_OWNER_PASSWORD minimal 8 karakter");
  if (!name) throw new Error("BOOTSTRAP_OWNER_NAME tidak boleh kosong");

  const admin = createSupabaseAdminClient().auth.admin;
  let authUser = await findAuthUserByEmail(email);
  let authCreated = false;
  if (!authUser) {
    const { data, error } = await admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
    authCreated = true;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shop =
        (await tx.shop.findFirst({ orderBy: { createdAt: "asc" } })) ??
        (await tx.shop.create({
          data: { name: "Hadzka Shop", timeZone: "Asia/Jakarta" },
        }));
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing?.authUserId && existing.authUserId !== authUser.id) {
        throw new Error("Email owner terhubung ke Supabase Auth user yang berbeda");
      }

      const owner = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              authUserId: authUser.id,
              name,
              role: "OWNER",
              isActive: true,
              shopId: shop.id,
            },
          })
        : await tx.user.create({
            data: {
              shopId: shop.id,
              authUserId: authUser.id,
              name,
              email,
              role: "OWNER",
            },
          });
      return { shopId: shop.id, ownerId: owner.id };
    });

    console.info("owner_bootstrap_completed", result);
  } catch (databaseError) {
    if (authCreated) {
      const { error } = await admin.deleteUser(authUser.id);
      if (error) {
        throw new AggregateError(
          [databaseError, error],
          "Bootstrap database gagal dan Auth user perlu direkonsiliasi",
        );
      }
    }
    throw databaseError;
  }
}

main()
  .catch((error) => {
    console.error("owner_bootstrap_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
