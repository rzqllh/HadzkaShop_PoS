import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TransactionsClient } from "./transactions-client";
import { Prisma } from "@/generated/prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; date?: string; status?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1") || 1;
  const pageSize = 25;

  const where: Prisma.TransactionWhereInput = {
    shopId: session.user.shopId,
  };

  if (params.status && ["COMPLETED", "PENDING", "CANCELLED"].includes(params.status)) {
    where.status = params.status as any;
  }

  if (params.date) {
    const start = new Date(params.date);
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }
  }

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        cashier: { select: { name: true } },
        items: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage transaction history.
          </p>
        </div>
      </div>

      <TransactionsClient
        transactions={transactions.map((t) => ({
          ...t,
          subtotal: Number(t.subtotal),
          discountAmount: Number(t.discountAmount),
          taxRate: Number(t.taxRate),
          taxAmount: Number(t.taxAmount),
          shippingCost: Number(t.shippingCost),
          total: Number(t.total),
          amountPaid: Number(t.amountPaid),
          changeDue: Number(t.changeDue),
          items: t.items.map((i) => ({
            ...i,
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.subtotal),
          })),
        }))}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  );
}
