import { prisma } from "../src/lib/prisma";
import { createSupabaseAdminClient } from "../src/lib/supabase-admin";
import { normalizeEmail } from "../src/server/users/service";

async function listAllAuthUsers() {
  const admin = createSupabaseAdminClient().auth.admin;
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 1_000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1_000) return users;
  }
}

async function main() {
  const [authUsers, appUsers] = await Promise.all([
    listAllAuthUsers(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, authUserId: true },
    }),
  ]);

  const authByEmail = new Map<string, string>();
  for (const authUser of authUsers) {
    if (!authUser.email) continue;
    const email = normalizeEmail(authUser.email);
    if (authByEmail.has(email)) {
      throw new Error("Supabase Auth memiliki email aktif yang duplikat setelah normalisasi");
    }
    authByEmail.set(email, authUser.id);
  }

  const appEmails = new Set<string>();
  const mappings: Array<{ id: string; authUserId: string }> = [];
  const unmatched: string[] = [];

  for (const appUser of appUsers) {
    const email = normalizeEmail(appUser.email);
    if (appEmails.has(email)) {
      throw new Error("Database aplikasi memiliki email aktif yang duplikat setelah normalisasi");
    }
    appEmails.add(email);

    const authUserId = authByEmail.get(email);
    if (!authUserId || (appUser.authUserId && appUser.authUserId !== authUserId)) {
      unmatched.push(appUser.id);
      continue;
    }
    if (!appUser.authUserId) mappings.push({ id: appUser.id, authUserId });
  }

  if (unmatched.length > 0) {
    throw new Error(
      `${unmatched.length} user aktif tidak dapat dipetakan; deployment dihentikan`,
    );
  }

  await prisma.$transaction(
    mappings.map((mapping) =>
      prisma.user.update({
        where: { id: mapping.id },
        data: { authUserId: mapping.authUserId },
      }),
    ),
  );

  console.info("auth_backfill_completed", {
    activeUsers: appUsers.length,
    linkedUsers: mappings.length,
  });
}

main()
  .catch((error) => {
    console.error("auth_backfill_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
