"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function openTillSession(startingCash: number) {
  const session = await auth();
  if (!session) return { success: false, message: "Not authenticated" };

  const shopId = session.user.shopId;
  const cashierId = session.user.id;

  const existing = await prisma.tillSession.findFirst({
    where: { shopId, cashierId, status: "OPEN" },
  });

  if (existing) {
    return { success: false, message: "Till is already open." };
  }

  await prisma.tillSession.create({
    data: {
      shopId,
      cashierId,
      startingCash,
      status: "OPEN",
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { success: true, message: "Till opened successfully." };
}

export async function closeTillSession(actualCash: number, notes?: string) {
  const session = await auth();
  if (!session) return { success: false, message: "Not authenticated" };

  const shopId = session.user.shopId;
  const cashierId = session.user.id;

  const openTill = await prisma.tillSession.findFirst({
    where: { shopId, cashierId, status: "OPEN" },
  });

  if (!openTill) {
    return { success: false, message: "No open till session found." };
  }

  const cashTransactions = await prisma.transaction.aggregate({
    where: {
      shopId,
      cashierId,
      status: "COMPLETED",
      paymentMethod: "CASH",
      createdAt: { gte: openTill.openedAt },
    },
    _sum: { total: true },
  });

  const cashSales = Number(cashTransactions._sum.total ?? 0);
  const expectedCash = Number(openTill.startingCash) + cashSales;
  const difference = actualCash - expectedCash;

  await prisma.tillSession.update({
    where: { id: openTill.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      expectedCash,
      actualCash,
      difference,
      notes: notes || null,
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { success: true, message: "Till closed successfully." };
}

export async function getExpectedCash() {
  const session = await auth();
  if (!session) return { success: false, expectedCash: 0, message: "Not authenticated" };

  const shopId = session.user.shopId;
  const cashierId = session.user.id;

  const openTill = await prisma.tillSession.findFirst({
    where: { shopId, cashierId, status: "OPEN" },
  });

  if (!openTill) return { success: false, expectedCash: 0, message: "No open till." };

  const cashTransactions = await prisma.transaction.aggregate({
    where: {
      shopId,
      cashierId,
      status: "COMPLETED",
      paymentMethod: "CASH",
      createdAt: { gte: openTill.openedAt },
    },
    _sum: { total: true },
  });

  const expectedCash = Number(openTill.startingCash) + Number(cashTransactions._sum.total ?? 0);
  return { success: true, expectedCash };
}
