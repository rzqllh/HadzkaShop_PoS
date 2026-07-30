import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { lockInventoryProducts } from "@/server/inventory/service";
import {
  nextTransactionStatus,
  providerTransactionStatus,
} from "@/server/payments/midtrans/status";

type ProviderStatusInput = {
  orderId: string;
  transactionStatus: string;
  transactionId?: string;
  grossAmount: string;
  fraudStatus?: string;
};

function itemQuantities(items: Array<{ productId: string; quantity: number }>) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return quantities;
}

async function releaseReservation(
  tx: Prisma.TransactionClient,
  shopId: string,
  items: Array<{ productId: string; quantity: number }>,
) {
  const quantities = itemQuantities(items);
  const productIds = [...quantities.keys()].sort();
  const products = await lockInventoryProducts(tx, shopId, productIds);
  if (products.length !== productIds.length) {
    throw new Error("Produk reservasi tidak lengkap");
  }

  for (const product of products) {
    const quantity = quantities.get(product.id) ?? 0;
    if (product.reservedStock < quantity) {
      throw new Error("Reservasi stok tidak konsisten");
    }
    await tx.product.update({
      where: { id: product.id },
      data: { reservedStock: product.reservedStock - quantity },
    });
  }
}

export async function markPaymentPending(
  db: PrismaClient,
  input: {
    transactionId: string;
    snapToken: string;
    expiresAt: Date;
  },
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "Transaction"
      WHERE "id" = ${input.transactionId}
      FOR UPDATE
    `);
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: input.transactionId },
    });

    if (transaction.status === "PENDING") return transaction;
    if (transaction.status !== "CREATING_PAYMENT") {
      throw new Error("Transaksi tidak lagi menunggu pembuatan pembayaran");
    }
    return tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "PENDING",
        midtransSnapToken: input.snapToken,
        paymentExpiresAt: input.expiresAt,
        midtransStatus: "pending",
      },
    });
  });
}

export async function markPaymentCreationFailed(
  db: PrismaClient,
  transactionId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "Transaction"
      WHERE "id" = ${transactionId}
      FOR UPDATE
    `);
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { items: { select: { productId: true, quantity: true } } },
    });

    if (transaction.status === "FAILED") return transaction;
    if (transaction.status !== "CREATING_PAYMENT") return transaction;

    await releaseReservation(tx, transaction.shopId, transaction.items);
    return tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED", midtransStatus: "creation_failure" },
    });
  });
}

export async function applyMidtransStatus(
  db: PrismaClient,
  input: ProviderStatusInput,
) {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Transaction"
      WHERE "midtransOrderId" = ${input.orderId}
      FOR UPDATE
    `);
    if (locked.length !== 1) throw new Error("Order Midtrans tidak ditemukan");

    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: locked[0].id },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!new Prisma.Decimal(input.grossAmount).equals(transaction.total)) {
      throw new Error("gross_amount Midtrans tidak cocok dengan total transaksi");
    }

    const providerState = providerTransactionStatus(
      input.transactionStatus,
      input.fraudStatus,
    );
    if (!providerState) {
      return { status: transaction.status, changed: false, conflict: true };
    }
    const nextStatus = nextTransactionStatus(
      transaction.status,
      input.transactionStatus,
      input.fraudStatus,
    );
    const providerData = {
      midtransStatus: input.transactionStatus,
      ...(input.transactionId
        ? { midtransTransactionId: input.transactionId }
        : {}),
    };

    if (nextStatus === transaction.status) {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: providerData,
      });
      return {
        status: transaction.status,
        changed: false,
        conflict: providerState !== transaction.status,
      };
    }

    if (nextStatus === "PENDING") {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { ...providerData, status: "PENDING" },
      });
      return { status: "PENDING" as const, changed: true, conflict: false };
    }

    if (nextStatus === "COMPLETED") {
      const quantities = itemQuantities(transaction.items);
      const productIds = [...quantities.keys()].sort();
      const products = await lockInventoryProducts(
        tx,
        transaction.shopId,
        productIds,
      );
      if (products.length !== productIds.length) {
        throw new Error("Produk transaksi tidak lengkap");
      }

      for (const product of products) {
        const quantity = quantities.get(product.id) ?? 0;
        if (
          product.reservedStock < quantity ||
          product.stock < quantity
        ) {
          throw new Error("Stok reservasi tidak cukup untuk settlement");
        }
        const newStock = product.stock - quantity;
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: newStock,
            reservedStock: product.reservedStock - quantity,
          },
        });
        await tx.stockMovement.create({
          data: {
            shopId: transaction.shopId,
            productId: product.id,
            userId: transaction.cashierId,
            type: "SALE",
            quantity,
            reason: `Sale #${transaction.transactionNumber}`,
            referenceId: transaction.id,
            previousStock: product.stock,
            newStock,
          },
        });
      }

      if (transaction.customerId) {
        await tx.customer.updateMany({
          where: {
            id: transaction.customerId,
            shopId: transaction.shopId,
          },
          data: {
            loyaltyPoints: {
              increment: transaction.total
                .dividedToIntegerBy(10_000)
                .toNumber(),
            },
            totalSpent: { increment: transaction.total },
          },
        });
      }

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          ...providerData,
          status: "COMPLETED",
          amountPaid: transaction.total,
          changeDue: 0,
          completedAt: new Date(),
        },
      });
      return { status: "COMPLETED" as const, changed: true, conflict: false };
    }

    await releaseReservation(tx, transaction.shopId, transaction.items);
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { ...providerData, status: nextStatus },
    });
    return { status: nextStatus, changed: true, conflict: false };
  });
}
