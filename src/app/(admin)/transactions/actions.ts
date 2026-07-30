"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { voidCashTransactionWithDatabase } from "@/server/transactions/void";
import { createMidtransClientFromEnv } from "@/server/payments/midtrans/client";
import { applyMidtransStatus } from "@/server/payments/midtrans/transitions";

export async function voidTransaction(transactionId: string) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") {
    return { success: false, message: "Unauthorized. Only owners can void transactions." };
  }

  const shopId = session.user.shopId;
  const userId = session.user.id;

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, shopId },
      select: {
        paymentMethod: true,
        status: true,
        midtransOrderId: true,
      },
    });
    if (!transaction) throw new Error("Transaksi tidak ditemukan.");

    if (transaction.paymentMethod === "QRIS") {
      if (transaction.status === "COMPLETED") {
        throw new Error(
          "QRIS yang sudah settled memerlukan refund flow provider.",
        );
      }
      if (
        transaction.status !== "PENDING" ||
        !transaction.midtransOrderId
      ) {
        throw new Error(
          "QRIS hanya dapat dibatalkan saat masih pending.",
        );
      }

      const provider = await createMidtransClientFromEnv().cancel(
        transaction.midtransOrderId,
      );
      if (provider.order_id !== transaction.midtransOrderId) {
        throw new Error("Midtrans order ID tidak cocok.");
      }
      await applyMidtransStatus(prisma, {
        orderId: provider.order_id,
        transactionStatus: provider.transaction_status,
        transactionId: provider.transaction_id,
        grossAmount: provider.gross_amount,
        fraudStatus: provider.fraud_status,
      });
    } else {
    await voidCashTransactionWithDatabase(prisma, {
      transactionId,
      shopId,
      ownerId: userId,
    });
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return {
      success: true,
      message:
        transaction.paymentMethod === "QRIS"
          ? "QRIS dibatalkan di provider dan reservasi stok dilepas."
          : "Transaksi dibatalkan dan seluruh efeknya dikembalikan.",
    };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to void transaction." };
  }
}

export async function exportTransactionsCsv(startDate?: string, endDate?: string, status?: string) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") throw new Error("Unauthorized");
  
  const where: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = { shopId: session.user.shopId };
  if (status && status !== "ALL") where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }
  }

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { cashier: true }
  });
  
  const header = ["Transaction ID", "Date", "Cashier", "Method", "Status", "Total", "Discount", "Subtotal", "Tax", "Items Sold"].join(",");
  const rows = txs.map(tx => [
    tx.transactionNumber,
    tx.createdAt.toISOString(),
    tx.cashier.name,
    tx.paymentMethod,
    tx.status,
    tx.total.toString(),
    tx.discountAmount.toString(),
    tx.subtotal.toString(),
    tx.taxAmount.toString(),
    tx.total.toString() // just an example, if items were included we could count them. But we only need basic financial export.
  ].join(","));
  
  return [header, ...rows].join("\n");
}
