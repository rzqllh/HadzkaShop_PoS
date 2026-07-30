import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { customersRouter } from "../src/server/api/routers/customers";
import { usersRouter } from "../src/server/api/routers/users";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test("access boundary PostgreSQL integration tests", { skip: "TEST_DATABASE_URL is not configured" }, () => {});
} else {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  test.after(async () => {
    await db.$disconnect();
    await pool.end();
  });

  test("customer and user routers neither read nor mutate another shop", async () => {
    const ownShop = await db.shop.create({
      data: { name: `Own ${randomUUID()}` },
    });
    const foreignShop = await db.shop.create({
      data: { name: `Foreign ${randomUUID()}` },
    });
    const [owner, foreignUser] = await Promise.all([
      db.user.create({
        data: {
          shopId: ownShop.id,
          name: "Owner",
          email: `${randomUUID()}@example.test`,
          role: "OWNER",
        },
      }),
      db.user.create({
        data: {
          shopId: foreignShop.id,
          name: "Foreign owner",
          email: `${randomUUID()}@example.test`,
          role: "OWNER",
        },
      }),
    ]);
    const [ownCustomer, foreignCustomer] = await Promise.all([
      db.customer.create({
        data: { shopId: ownShop.id, name: "Own customer" },
      }),
      db.customer.create({
        data: { shopId: foreignShop.id, name: "Foreign customer" },
      }),
    ]);
    const context = {
      db,
      headers: new Headers(),
      session: {
        user: {
          id: owner.id,
          shopId: ownShop.id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
        },
      },
    };
    const customers = customersRouter.createCaller(context);
    const users = usersRouter.createCaller(context);

    try {
      assert.deepEqual(
        (await customers.getAll()).map((customer) => customer.id),
        [ownCustomer.id],
      );
      assert.equal(await customers.getById({ id: foreignCustomer.id }), null);
      await assert.rejects(() =>
        customers.update({
          id: foreignCustomer.id,
          name: "Tampered",
        }),
      );
      await assert.rejects(() =>
        customers.delete({ id: foreignCustomer.id }),
      );

      assert.deepEqual(
        (await users.getAll()).map((user) => user.id),
        [owner.id],
      );
      await assert.rejects(() =>
        users.updateProfile({
          id: foreignUser.id,
          name: "Tampered",
          role: "CASHIER",
        }),
      );

      assert.equal(
        (await db.customer.findUniqueOrThrow({
          where: { id: foreignCustomer.id },
        })).name,
        "Foreign customer",
      );
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: foreignUser.id } }))
          .role,
        "OWNER",
      );
    } finally {
      await db.shop.deleteMany({
        where: { id: { in: [ownShop.id, foreignShop.id] } },
      });
    }
  });
}
