import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ReceiptClient } from "./receipt-client";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const { id } = await params;
  
  const transaction = await prisma.transaction.findUnique({
    where: {
      id,
      shopId: session.user.shopId,
    },
    include: {
      items: true,
      cashier: {
        select: { name: true },
      },
      shop: {
        select: {
          name: true,
          address: true,
          phone: true,
          receiptHeader: true,
          receiptFooter: true,
        }
      }
    },
  });

  if (!transaction) notFound();

  return <ReceiptClient transaction={transaction as any} />;
}
