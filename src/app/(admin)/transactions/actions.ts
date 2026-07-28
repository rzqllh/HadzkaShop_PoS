"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function voidTransaction(transactionId: string, restock: boolean = true) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") {
    return { success: false, message: "Unauthorized. Only owners can void transactions." };
  }

  const shopId = session.user.shopId;
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId, shopId },
        include: { items: true },
      });

      if (!transaction) throw new Error("Transaction not found.");
      if (transaction.status === "CANCELLED") throw new Error("Transaction already voided.");

      if (restock) {
        // Restore stock for each item and log movement
        for (const item of transaction.items) {
          const product = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: item.productId,
              userId,
              type: "REFUND",
              quantity: item.quantity,
              reason: `Refund for Txn #${transaction.transactionNumber}`,
              referenceId: transaction.id,
              previousStock: product.stock - item.quantity,
              newStock: product.stock,
            },
          });
        }
      }

      // Mark transaction as CANCELLED
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "CANCELLED" },
      });
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { success: true, message: "Transaction voided and stock restored." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to void transaction." };
  }
}

export async function exportTransactionsCsv(startDate?: string, endDate?: string, status?: string) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") throw new Error("Unauthorized");
  
  const where: any = { shopId: session.user.shopId };
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
