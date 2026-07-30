import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { checkoutWithDatabase } from "../src/server/checkout/service";
import { adjustInventory } from "../src/server/inventory/service";
import { voidCashTransactionWithDatabase } from "../src/server/transactions/void";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test("checkout PostgreSQL integration tests", { skip: "TEST_DATABASE_URL is not configured" }, () => {});
} else {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  test.after(async () => {
    await db.$disconnect();
    await pool.end();
  });

  async function createFixture(stock = 1) {
    const shop = await db.shop.create({
      data: { name: `Shop ${randomUUID()}`, taxRate: 11, timeZone: "Asia/Jakarta" },
    });
    const cashier = await db.user.create({
      data: {
        shopId: shop.id,
        name: "Cashier",
        email: `${randomUUID()}@example.test`,
        role: "OWNER",
      },
    });
    const product = await db.product.create({
      data: {
        shopId: shop.id,
        name: "Last item",
        sku: randomUUID(),
        price: 10_000,
        stock,
      },
    });

    return { shop, cashier, product };
  }

  function cashInput(productId: string, clientRequestId = randomUUID()) {
    return {
      clientRequestId,
      items: [{ productId, quantity: 1 }],
      discount: null,
      taxRateOverride: "0",
      shippingCost: "0",
      paymentMethod: "CASH" as const,
      amountPaid: "10000",
    };
  }

  async function deleteFixtureShops(shopIds: string[]) {
    await db.transaction.deleteMany({ where: { shopId: { in: shopIds } } });
    await db.shop.deleteMany({ where: { id: { in: shopIds } } });
  }

  test("two parallel cash checkouts for the last unit produce one sale", async () => {
    const fixture = await createFixture();
    try {
      const results = await Promise.allSettled([
        checkoutWithDatabase(
          db,
          { shopId: fixture.shop.id, userId: fixture.cashier.id },
          cashInput(fixture.product.id),
        ),
        checkoutWithDatabase(
          db,
          { shopId: fixture.shop.id, userId: fixture.cashier.id },
          cashInput(fixture.product.id),
        ),
      ]);

      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);

      const [product, sales, movements] = await Promise.all([
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.transaction.count({
          where: { shopId: fixture.shop.id, status: "COMPLETED" },
        }),
        db.stockMovement.count({
          where: { shopId: fixture.shop.id, type: "SALE" },
        }),
      ]);
      assert.equal(product.stock, 0);
      assert.equal(product.reservedStock, 0);
      assert.equal(sales, 1);
      assert.equal(movements, 1);
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });

  test("parallel retries with one clientRequestId return one transaction", async () => {
    const fixture = await createFixture(2);
    const clientRequestId = randomUUID();
    try {
      const [first, second] = await Promise.all([
        checkoutWithDatabase(
          db,
          { shopId: fixture.shop.id, userId: fixture.cashier.id },
          cashInput(fixture.product.id, clientRequestId),
        ),
        checkoutWithDatabase(
          db,
          { shopId: fixture.shop.id, userId: fixture.cashier.id },
          cashInput(fixture.product.id, clientRequestId),
        ),
      ]);

      assert.equal(first.transactionId, second.transactionId);
      assert.equal(
        await db.transaction.count({
          where: { shopId: fixture.shop.id, clientRequestId },
        }),
        1,
      );
      assert.equal(
        await db.stockMovement.count({
          where: { shopId: fixture.shop.id, type: "SALE" },
        }),
        1,
      );
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: fixture.product.id } })).stock,
        1,
      );
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });

  test("checkout rejects products and customers owned by another shop", async () => {
    const own = await createFixture();
    const foreign = await createFixture();
    const foreignCustomer = await db.customer.create({
      data: { shopId: foreign.shop.id, name: "Foreign customer" },
    });

    try {
      await assert.rejects(() =>
        checkoutWithDatabase(
          db,
          { shopId: own.shop.id, userId: own.cashier.id },
          cashInput(foreign.product.id),
        ),
      );
      await assert.rejects(() =>
        checkoutWithDatabase(
          db,
          { shopId: own.shop.id, userId: own.cashier.id },
          { ...cashInput(own.product.id), customerId: foreignCustomer.id },
        ),
      );

      assert.equal(await db.transaction.count({ where: { shopId: own.shop.id } }), 0);
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: own.product.id } })).stock,
        1,
      );
    } finally {
      await deleteFixtureShops([own.shop.id, foreign.shop.id]);
    }
  });

  test("QRIS reservation blocks a cash checkout from overselling stock", async () => {
    const fixture = await createFixture();
    try {
      const qris = await checkoutWithDatabase(
        db,
        { shopId: fixture.shop.id, userId: fixture.cashier.id },
        {
          ...cashInput(fixture.product.id),
          clientRequestId: randomUUID(),
          paymentMethod: "QRIS",
          amountPaid: undefined,
        },
      );
      assert.equal(qris.status, "CREATING_PAYMENT");

      await assert.rejects(() =>
        checkoutWithDatabase(
          db,
          { shopId: fixture.shop.id, userId: fixture.cashier.id },
          cashInput(fixture.product.id),
        ),
      );

      const product = await db.product.findUniqueOrThrow({
        where: { id: fixture.product.id },
      });
      assert.equal(product.stock, 1);
      assert.equal(product.reservedStock, 1);
      assert.equal(
        await db.stockMovement.count({ where: { shopId: fixture.shop.id } }),
        0,
      );
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });

  test("manual subtraction cannot consume reserved stock", async () => {
    const fixture = await createFixture(2);
    await db.product.update({
      where: { id: fixture.product.id },
      data: { reservedStock: 1 },
    });

    try {
      await assert.rejects(() =>
        adjustInventory(db, {
          shopId: fixture.shop.id,
          productId: fixture.product.id,
          userId: fixture.cashier.id,
          mode: "SUBTRACT",
          quantity: 2,
          reason: "Damaged",
        }),
      );

      await adjustInventory(db, {
        shopId: fixture.shop.id,
        productId: fixture.product.id,
        userId: fixture.cashier.id,
        mode: "SUBTRACT",
        quantity: 1,
        reason: "Damaged",
      });
      const product = await db.product.findUniqueOrThrow({
        where: { id: fixture.product.id },
      });
      assert.equal(product.stock, 1);
      assert.equal(product.reservedStock, 1);
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });

  test("cash void reverses stock, ledger, and loyalty exactly once", async () => {
    const fixture = await createFixture(2);
    const customer = await db.customer.create({
      data: { shopId: fixture.shop.id, name: "Loyal customer" },
    });

    try {
      const checkout = await checkoutWithDatabase(
        db,
        { shopId: fixture.shop.id, userId: fixture.cashier.id },
        { ...cashInput(fixture.product.id), customerId: customer.id },
      );
      await voidCashTransactionWithDatabase(db, {
        transactionId: checkout.transactionId,
        shopId: fixture.shop.id,
        ownerId: fixture.cashier.id,
      });
      await assert.rejects(() =>
        voidCashTransactionWithDatabase(db, {
          transactionId: checkout.transactionId,
          shopId: fixture.shop.id,
          ownerId: fixture.cashier.id,
        }),
      );

      const [transaction, product, updatedCustomer, refunds] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.customer.findUniqueOrThrow({ where: { id: customer.id } }),
        db.stockMovement.count({
          where: {
            referenceId: checkout.transactionId,
            type: "REFUND",
          },
        }),
      ]);
      assert.equal(transaction.status, "CANCELLED");
      assert.equal(product.stock, 2);
      assert.equal(refunds, 1);
      assert.equal(updatedCustomer.loyaltyPoints, 0);
      assert.equal(updatedCustomer.totalSpent.toString(), "0");
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });

  test("QRIS transactions cannot use the cash void flow", async () => {
    const fixture = await createFixture();
    try {
      const checkout = await checkoutWithDatabase(
        db,
        { shopId: fixture.shop.id, userId: fixture.cashier.id },
        {
          ...cashInput(fixture.product.id),
          paymentMethod: "QRIS",
          amountPaid: undefined,
        },
      );

      await assert.rejects(() =>
        voidCashTransactionWithDatabase(db, {
          transactionId: checkout.transactionId,
          shopId: fixture.shop.id,
          ownerId: fixture.cashier.id,
        }),
      );
      assert.equal(
        (
          await db.product.findUniqueOrThrow({
            where: { id: fixture.product.id },
          })
        ).reservedStock,
        1,
      );
    } finally {
      await deleteFixtureShops([fixture.shop.id]);
    }
  });
}
