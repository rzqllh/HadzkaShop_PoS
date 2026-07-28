"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type TransactionItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
};

type SubmitTransactionPayload = {
  items: TransactionItem[];
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  subtotal: number;
  total: number;
  paymentMethod: "CASH" | "QRIS";
  amountPaid: number;
  note?: string;
};

export async function submitTransaction(
  payload: SubmitTransactionPayload
): Promise<{ success: boolean; message: string; transactionId?: string }> {
  const session = await auth();
  if (!session) return { success: false, message: "Not authenticated." };

  const shopId = session.user.shopId;
  const cashierId = session.user.id;

  if (!payload.items.length) {
    return { success: false, message: "Cart is empty." };
  }

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      // Generate unique transaction number: TXN-YYYYMMDD-NNNNN
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const count = await tx.transaction.count({
        where: {
          shopId,
          createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) },
        },
      });
      const transactionNumber = `TXN-${dateStr}-${String(count + 1).padStart(4, "0")}`;

      // Lock and verify stock for each product
      const productStocks = new Map<string, number>();
      for (const item of payload.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, shopId, isActive: true },
        });
        if (!product) {
          throw new Error(`Product not found: ${item.productName}`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
        }
        productStocks.set(item.productId, product.stock);
      }

      // Deduct stock
      for (const item of payload.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create transaction
      const created = await tx.transaction.create({
        data: {
          shopId,
          cashierId,
          transactionNumber,
          status: "COMPLETED",
          paymentMethod: payload.paymentMethod,
          subtotal: payload.subtotal,
          discountAmount: payload.discountAmount,
          taxRate: payload.taxRate,
          taxAmount: payload.taxAmount,
          shippingCost: payload.shippingCost,
          total: payload.total,
          amountPaid: payload.amountPaid,
          changeDue: Math.max(0, payload.amountPaid - payload.total),
          note: payload.note || null,
          items: {
            create: payload.items.map((item) => ({
              productId: item.productId,
              productName: item.productName, // snapshot
              unitPrice: item.unitPrice,     // snapshot
              costPrice: 0, // Should be fetched from product.costPrice if available, skipping for now
              quantity: item.quantity,
              subtotal: item.unitPrice * item.quantity,
            })),
          },
        },
      });

      // Create stock movements for the sale
      for (const item of payload.items) {
        const prevStock = productStocks.get(item.productId) || 0;
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: item.productId,
            userId: cashierId,
            type: "SALE",
            quantity: item.quantity,
            reason: `Sale #${transactionNumber}`,
            referenceId: created.id,
            previousStock: prevStock,
            newStock: prevStock - item.quantity,
          }
        });
      }

      return created;
    });

    return {
      success: true,
      message: "Transaction completed.",
      transactionId: transaction.id,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to submit transaction.",
    };
  }
}
