"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function voidTransaction(transactionId: string) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") {
    return { success: false, message: "Unauthorized. Only owners can void transactions." };
  }

  const shopId = session.user.shopId;

  try {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId, shopId },
        include: { items: true },
      });

      if (!transaction) throw new Error("Transaction not found.");
      if (transaction.status === "CANCELLED") throw new Error("Transaction already voided.");

      // Restore stock for each item
      for (const item of transaction.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
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
