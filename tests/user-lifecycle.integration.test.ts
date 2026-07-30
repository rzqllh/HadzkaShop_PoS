import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  createStaffWithDatabase,
  deactivateUserWithDatabase,
  updateUserProfileWithDatabase,
  type AuthAdminGateway,
} from "../src/server/users/service";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test("user lifecycle PostgreSQL integration tests", { skip: "TEST_DATABASE_URL is not configured" }, () => {});
} else {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  class FakeAuthAdmin implements AuthAdminGateway {
    users = new Map<string, { email: string; password: string; banned: boolean }>();

    async createUser(input: { email: string; password: string }) {
      const id = randomUUID();
      this.users.set(id, { ...input, banned: false });
      return { user: { id } };
    }

    async deleteUser(id: string) {
      this.users.delete(id);
    }

    async updateUserById(
      id: string,
      attributes: { email?: string; password?: string; banDuration?: string },
    ) {
      const user = this.users.get(id);
      if (!user) throw new Error("Auth user missing");
      this.users.set(id, {
        email: attributes.email ?? user.email,
        password: attributes.password ?? user.password,
        banned: attributes.banDuration !== undefined ? attributes.banDuration !== "none" : user.banned,
      });
    }
  }

  test.after(async () => {
    await db.$disconnect();
    await pool.end();
  });

  async function createOwnerFixture() {
    const shop = await db.shop.create({ data: { name: `Users ${randomUUID()}` } });
    const authUserId = randomUUID();
    const owner = await db.user.create({
      data: {
        shopId: shop.id,
        name: "Owner",
        email: `${randomUUID()}@example.test`,
        authUserId,
        role: "OWNER",
      },
    });
    return { shop, owner };
  }

  test("concurrent staff creation compensates the losing Auth user", async () => {
    const { shop, owner } = await createOwnerFixture();
    const admin = new FakeAuthAdmin();
    try {
      const input = {
        name: "Cashier",
        email: `${randomUUID()}@example.test`,
        password: "strong-password",
        role: "CASHIER" as const,
      };
      const results = await Promise.allSettled([
        createStaffWithDatabase(db, admin, {
          actorId: owner.id,
          shopId: shop.id,
          input,
        }),
        createStaffWithDatabase(db, admin, {
          actorId: owner.id,
          shopId: shop.id,
          input,
        }),
      ]);

      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      assert.equal(await db.user.count({ where: { shopId: shop.id, email: input.email } }), 1);
      assert.equal(admin.users.size, 1);
    } finally {
      await db.shop.delete({ where: { id: shop.id } });
    }
  });

  test("last owner cannot be demoted or deactivated", async () => {
    const { shop, owner } = await createOwnerFixture();
    const admin = new FakeAuthAdmin();
    admin.users.set(owner.authUserId!, {
      email: owner.email,
      password: "hidden",
      banned: false,
    });

    try {
      await assert.rejects(() =>
        updateUserProfileWithDatabase(db, {
          actorId: owner.id,
          shopId: shop.id,
          userId: owner.id,
          name: owner.name,
          role: "CASHIER",
        }),
      );
      await assert.rejects(() =>
        deactivateUserWithDatabase(db, admin, {
          actorId: owner.id,
          shopId: shop.id,
          userId: owner.id,
        }),
      );
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).isActive,
        true,
      );
    } finally {
      await db.shop.delete({ where: { id: shop.id } });
    }
  });
}
