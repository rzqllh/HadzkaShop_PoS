import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { checkoutWithDatabase } from "../src/server/checkout/service";
import {
  applyMidtransStatus,
  markPaymentCreationFailed,
  markPaymentPending,
} from "../src/server/payments/midtrans/transitions";
import { notificationSignature } from "../src/server/payments/midtrans/client";
import { processMidtransNotification } from "../src/server/payments/midtrans/webhook";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test("Midtrans PostgreSQL integration tests", { skip: "TEST_DATABASE_URL is not configured" }, () => {});
} else {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  test.after(async () => {
    await db.$disconnect();
    await pool.end();
  });

  async function createPendingPayment(withCustomer = false, pending = true) {
    const shop = await db.shop.create({
      data: { name: `Payment ${randomUUID()}`, taxRate: 0 },
    });
    const owner = await db.user.create({
      data: {
        shopId: shop.id,
        name: "Owner",
        email: `${randomUUID()}@example.test`,
        role: "OWNER",
      },
    });
    const product = await db.product.create({
      data: {
        shopId: shop.id,
        name: "QRIS item",
        sku: randomUUID(),
        price: 10_000,
        stock: 1,
      },
    });
    const customer = withCustomer
      ? await db.customer.create({
          data: { shopId: shop.id, name: "Customer" },
        })
      : null;
    const checkout = await checkoutWithDatabase(
      db,
      { shopId: shop.id, userId: owner.id },
      {
        clientRequestId: randomUUID(),
        items: [{ productId: product.id, quantity: 1 }],
        discount: null,
        taxRateOverride: null,
        shippingCost: "0",
        paymentMethod: "QRIS",
        customerId: customer?.id,
      },
    );
    if (pending) {
      await markPaymentPending(db, {
        transactionId: checkout.transactionId,
        snapToken: "snap-token",
        expiresAt: new Date(Date.now() + 15 * 60_000),
      });
    }
    return { shop, owner, product, customer, checkout };
  }

  async function cleanup(shopId: string) {
    await db.transaction.deleteMany({ where: { shopId } });
    await db.shop.delete({ where: { id: shopId } });
  }

  test("duplicate settlement finalizes reserved stock and loyalty once", async () => {
    const fixture = await createPendingPayment(true);
    const status = {
      orderId: fixture.checkout.transactionId,
      transactionStatus: "settlement",
      transactionId: "provider-transaction",
      grossAmount: "10000.00",
      fraudStatus: "accept",
    };
    try {
      await Promise.all([
        applyMidtransStatus(db, status),
        applyMidtransStatus(db, status),
      ]);

      const [transaction, product, movements, customer] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: fixture.checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.stockMovement.count({
          where: {
            referenceId: fixture.checkout.transactionId,
            type: "SALE",
          },
        }),
        db.customer.findUniqueOrThrow({ where: { id: fixture.customer!.id } }),
      ]);
      assert.equal(transaction.status, "COMPLETED");
      assert.equal(product.stock, 0);
      assert.equal(product.reservedStock, 0);
      assert.equal(movements, 1);
      assert.equal(customer.loyaltyPoints, 1);
      assert.equal(customer.totalSpent.toString(), "10000");
    } finally {
      await cleanup(fixture.shop.id);
    }
  });

  test("duplicate expiry releases reservation once and late pending cannot regress", async () => {
    const fixture = await createPendingPayment();
    try {
      const expiry = {
        orderId: fixture.checkout.transactionId,
        transactionStatus: "expire",
        transactionId: "provider-expired",
        grossAmount: "10000.00",
      };
      await Promise.all([
        applyMidtransStatus(db, expiry),
        applyMidtransStatus(db, expiry),
      ]);
      await applyMidtransStatus(db, {
        ...expiry,
        transactionStatus: "pending",
      });

      const [transaction, product] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: fixture.checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
      ]);
      assert.equal(transaction.status, "EXPIRED");
      assert.equal(product.stock, 1);
      assert.equal(product.reservedStock, 0);
      assert.equal(
        await db.stockMovement.count({
          where: { referenceId: fixture.checkout.transactionId },
        }),
        0,
      );
    } finally {
      await cleanup(fixture.shop.id);
    }
  });

  test("provider creation failure releases reservation exactly once", async () => {
    const fixture = await createPendingPayment(false, false);
    try {
      await markPaymentCreationFailed(db, fixture.checkout.transactionId);
      await markPaymentCreationFailed(db, fixture.checkout.transactionId);

      const transaction = await db.transaction.findUniqueOrThrow({
        where: { id: fixture.checkout.transactionId },
      });
      const product = await db.product.findUniqueOrThrow({
        where: { id: fixture.product.id },
      });
      assert.equal(transaction.status, "FAILED");
      assert.equal(product.reservedStock, 0);
      assert.equal(product.stock, 1);
    } finally {
      await cleanup(fixture.shop.id);
    }
  });

  test("cancel releases reservation once", async () => {
    const fixture = await createPendingPayment();
    try {
      const cancellation = {
        orderId: fixture.checkout.transactionId,
        transactionStatus: "cancel",
        transactionId: "provider-cancelled",
        grossAmount: "10000.00",
      };
      await applyMidtransStatus(db, cancellation);
      await applyMidtransStatus(db, cancellation);

      const [transaction, product, movements] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: fixture.checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.stockMovement.count({
          where: { referenceId: fixture.checkout.transactionId },
        }),
      ]);
      assert.equal(transaction.status, "CANCELLED");
      assert.equal(product.stock, 1);
      assert.equal(product.reservedStock, 0);
      assert.equal(movements, 0);
    } finally {
      await cleanup(fixture.shop.id);
    }
  });

  test("settlement and expiry race has exactly one terminal inventory effect", async () => {
    const fixture = await createPendingPayment();
    try {
      await Promise.all([
        applyMidtransStatus(db, {
          orderId: fixture.checkout.transactionId,
          transactionStatus: "settlement",
          transactionId: "provider-race",
          grossAmount: "10000.00",
        }),
        applyMidtransStatus(db, {
          orderId: fixture.checkout.transactionId,
          transactionStatus: "expire",
          transactionId: "provider-race",
          grossAmount: "10000.00",
        }),
      ]);

      const [transaction, product, movements] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: fixture.checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.stockMovement.count({
          where: {
            referenceId: fixture.checkout.transactionId,
            type: "SALE",
          },
        }),
      ]);

      assert.ok(["COMPLETED", "EXPIRED"].includes(transaction.status));
      if (transaction.status === "COMPLETED") {
        assert.equal(product.stock, 0);
        assert.equal(movements, 1);
      } else {
        assert.equal(product.stock, 1);
        assert.equal(movements, 0);
      }
      assert.equal(product.reservedStock, 0);
    } finally {
      await cleanup(fixture.shop.id);
    }
  });

  test("deterministic webhook replay settles stock exactly once", async () => {
    const fixture = await createPendingPayment();
    const serverKey = "test-server-key";
    const notification = {
      order_id: fixture.checkout.transactionId,
      status_code: "200",
      gross_amount: "10000.00",
      transaction_status: "settlement",
      transaction_id: "provider-webhook-replay",
      fraud_status: "accept",
    };
    const rawBody = JSON.stringify({
      ...notification,
      signature_key: notificationSignature(
        {
          orderId: notification.order_id,
          statusCode: notification.status_code,
          grossAmount: notification.gross_amount,
        },
        serverKey,
      ),
    });
    const statusClient = {
      async getStatus() {
        throw new Error("Get Status tidak diperlukan untuk replay valid");
      },
    };

    try {
      await processMidtransNotification(db, statusClient, serverKey, rawBody);
      await processMidtransNotification(db, statusClient, serverKey, rawBody);

      const [transaction, product, movements] = await Promise.all([
        db.transaction.findUniqueOrThrow({
          where: { id: fixture.checkout.transactionId },
        }),
        db.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
        db.stockMovement.count({
          where: {
            referenceId: fixture.checkout.transactionId,
            type: "SALE",
          },
        }),
      ]);
      assert.equal(transaction.status, "COMPLETED");
      assert.equal(product.stock, 0);
      assert.equal(product.reservedStock, 0);
      assert.equal(movements, 1);
    } finally {
      await cleanup(fixture.shop.id);
    }
  });
}
