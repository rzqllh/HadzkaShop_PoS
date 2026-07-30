import { randomUUID } from "node:crypto";

import {
  Prisma,
  type PrismaClient,
  type TransactionStatus,
} from "@/generated/prisma/client";
import {
  aggregateCheckoutItems,
  checkoutInputSchema,
  type CheckoutInput,
} from "@/server/checkout/input";
import {
  calculateCheckoutTotals,
  getBusinessDate,
  roundIdr,
  transactionNumberFor,
} from "@/server/checkout/money";
import {
  applyCashSaleInventory,
  lockInventoryProducts,
  reserveCheckoutInventory,
} from "@/server/inventory/service";

type CheckoutActor = {
  shopId: string;
  userId: string;
};

type CheckoutResult = {
  transactionId: string;
  transactionNumber: string;
  status: TransactionStatus;
  total: string;
  reused: boolean;
};

function resultFromTransaction(
  transaction: {
    id: string;
    transactionNumber: string;
    status: TransactionStatus;
    total: Prisma.Decimal;
  },
  reused: boolean,
): CheckoutResult {
  return {
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    status: transaction.status,
    total: transaction.total.toFixed(0),
    reused,
  };
}

export async function checkoutWithDatabase(
  db: PrismaClient,
  actor: CheckoutActor,
  rawInput: CheckoutInput,
  now = new Date(),
) {
  const input = checkoutInputSchema.parse(rawInput);
  const requestedItems = aggregateCheckoutItems(input.items);

  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${actor.shopId}:${input.clientRequestId}`}, 0)
        )::text AS "lock"
      `);

      const existing = await tx.transaction.findUnique({
        where: {
          shopId_clientRequestId: {
            shopId: actor.shopId,
            clientRequestId: input.clientRequestId,
          },
        },
      });
      if (existing) return resultFromTransaction(existing, true);

      const [shop, cashier] = await Promise.all([
        tx.shop.findUnique({
          where: { id: actor.shopId },
          select: { taxRate: true, timeZone: true },
        }),
        tx.user.findFirst({
          where: {
            id: actor.userId,
            shopId: actor.shopId,
            isActive: true,
          },
          select: { id: true },
        }),
      ]);
      if (!shop || !cashier) throw new Error("Sesi kasir tidak valid");

      if (input.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, shopId: actor.shopId },
          select: { id: true },
        });
        if (!customer) throw new Error("Pelanggan tidak ditemukan");
      }

      const products = await lockInventoryProducts(
        tx,
        actor.shopId,
        requestedItems.map((item) => item.productId),
      );
      if (
        products.length !== requestedItems.length ||
        products.some((product) => !product.isActive)
      ) {
        throw new Error("Satu atau lebih produk tidak ditemukan");
      }

      const quantities = new Map(
        requestedItems.map((item) => [item.productId, item.quantity]),
      );
      const inventoryItems = products.map((product) => ({
        product,
        quantity: quantities.get(product.id) ?? 0,
      }));
      const totals = calculateCheckoutTotals({
        products: inventoryItems.map(({ product, quantity }) => ({
          id: product.id,
          price: product.price,
          quantity,
        })),
        discount: input.discount,
        taxRate: input.taxRateOverride ?? shop.taxRate,
        shippingCost: input.shippingCost,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
      });

      const businessDate = getBusinessDate(now, shop.timeZone);
      const counter = await tx.transactionCounter.upsert({
        where: {
          shopId_businessDate: { shopId: actor.shopId, businessDate },
        },
        create: { shopId: actor.shopId, businessDate, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
        select: { lastValue: true },
      });
      const transactionNumber = transactionNumberFor(
        businessDate,
        counter.lastValue,
      );
      const transactionId = randomUUID();
      const isCash = input.paymentMethod === "CASH";

      const transaction = await tx.transaction.create({
        data: {
          id: transactionId,
          shopId: actor.shopId,
          cashierId: actor.userId,
          customerId: input.customerId ?? null,
          transactionNumber,
          businessDate,
          clientRequestId: input.clientRequestId,
          status: isCash ? "COMPLETED" : "CREATING_PAYMENT",
          paymentMethod: input.paymentMethod,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountType: input.discount?.type ?? null,
          discountValue: input.discount
            ? input.discount.type === "FIXED"
              ? roundIdr(input.discount.value)
              : new Prisma.Decimal(input.discount.value)
            : null,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          shippingCost: totals.shippingCost,
          total: totals.total,
          amountPaid: totals.amountPaid,
          changeDue: totals.changeDue,
          note: input.note || null,
          midtransOrderId: isCash ? null : transactionId,
          completedAt: isCash ? now : null,
          items: {
            create: inventoryItems.map(({ product, quantity }) => {
              const unitPrice = roundIdr(product.price);
              return {
                productId: product.id,
                productName: product.name,
                unitPrice,
                costPrice: product.costPrice
                  ? roundIdr(product.costPrice)
                  : null,
                quantity,
                subtotal: unitPrice.times(quantity),
              };
            }),
          },
        },
      });

      if (isCash) {
        await applyCashSaleInventory(tx, {
          shopId: actor.shopId,
          userId: actor.userId,
          transactionId,
          transactionNumber,
          items: inventoryItems,
        });

        if (input.customerId) {
          await tx.customer.updateMany({
            where: { id: input.customerId, shopId: actor.shopId },
            data: {
              loyaltyPoints: {
                increment: totals.total.dividedToIntegerBy(10_000).toNumber(),
              },
              totalSpent: { increment: totals.total },
            },
          });
        }
      } else {
        await reserveCheckoutInventory(tx, inventoryItems);
      }

      return resultFromTransaction(transaction, false);
    },
    {
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
}
