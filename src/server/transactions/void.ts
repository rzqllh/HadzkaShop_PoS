import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { lockInventoryProducts } from "@/server/inventory/service";

type VoidCashInput = {
  transactionId: string;
  shopId: string;
  ownerId: string;
};

export async function voidCashTransactionWithDatabase(
  db: PrismaClient,
  input: VoidCashInput,
) {
  return db.$transaction(async (tx) => {
    const owner = await tx.user.findFirst({
      where: {
        id: input.ownerId,
        shopId: input.shopId,
        role: "OWNER",
        isActive: true,
      },
      select: { id: true },
    });
    if (!owner) throw new Error("Hanya owner aktif yang dapat membatalkan transaksi");

    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Transaction"
      WHERE "id" = ${input.transactionId}
        AND "shopId" = ${input.shopId}
      FOR UPDATE
    `);
    if (locked.length !== 1) throw new Error("Transaksi tidak ditemukan");

    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: input.transactionId },
      include: { items: true },
    });
    if (transaction.paymentMethod !== "CASH") {
      throw new Error("Transaksi QRIS harus melalui cancel atau refund provider");
    }
    if (transaction.status !== "COMPLETED") {
      throw new Error(
        transaction.status === "CANCELLED"
          ? "Transaksi sudah dibatalkan"
          : "Hanya transaksi tunai selesai yang dapat dibatalkan",
      );
    }

    const quantities = new Map<string, number>();
    for (const item of transaction.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const productIds = [...quantities.keys()].sort();
    const products = await lockInventoryProducts(tx, input.shopId, productIds);
    if (products.length !== productIds.length) {
      throw new Error("Produk transaksi tidak lengkap");
    }

    for (const product of products) {
      const quantity = quantities.get(product.id) ?? 0;
      const newStock = product.stock + quantity;
      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });
      await tx.stockMovement.create({
        data: {
          shopId: input.shopId,
          productId: product.id,
          userId: input.ownerId,
          type: "REFUND",
          quantity,
          reason: `Void #${transaction.transactionNumber}`,
          referenceId: transaction.id,
          previousStock: product.stock,
          newStock,
        },
      });
    }

    if (transaction.customerId) {
      const points = transaction.total.dividedToIntegerBy(10_000).toNumber();
      const customerUpdate = await tx.customer.updateMany({
        where: {
          id: transaction.customerId,
          shopId: input.shopId,
          loyaltyPoints: { gte: points },
          totalSpent: { gte: transaction.total },
        },
        data: {
          loyaltyPoints: { decrement: points },
          totalSpent: { decrement: transaction.total },
        },
      });
      if (customerUpdate.count !== 1) {
        throw new Error("Saldo loyalitas pelanggan tidak konsisten");
      }
    }

    return tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "CANCELLED" },
    });
  });
}
