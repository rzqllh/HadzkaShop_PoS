import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { resolveAppIdentity } from "../src/server/auth/identity";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test("auth PostgreSQL integration tests", { skip: "TEST_DATABASE_URL is not configured" }, () => {});
} else {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  test.after(async () => {
    await db.$disconnect();
    await pool.end();
  });

  test("identity is resolved by Supabase user id and rejects inactive users", async () => {
    const shop = await db.shop.create({ data: { name: `Auth ${randomUUID()}` } });
    const activeAuthId = randomUUID();
    const inactiveAuthId = randomUUID();
    await db.user.createMany({
      data: [
        {
          shopId: shop.id,
          name: "Active",
          email: `${randomUUID()}@example.test`,
          authUserId: activeAuthId,
          role: "OWNER",
          isActive: true,
        },
        {
          shopId: shop.id,
          name: "Inactive",
          email: `${randomUUID()}@example.test`,
          authUserId: inactiveAuthId,
          role: "CASHIER",
          isActive: false,
        },
      ],
    });

    try {
      const active = await resolveAppIdentity(db, activeAuthId);
      assert.equal(active?.shopId, shop.id);
      assert.equal(active?.role, "OWNER");
      assert.equal(await resolveAppIdentity(db, inactiveAuthId), null);
      assert.equal(await resolveAppIdentity(db, randomUUID()), null);
    } finally {
      await db.shop.delete({ where: { id: shop.id } });
    }
  });
}
