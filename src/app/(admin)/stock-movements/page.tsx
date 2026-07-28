import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { StockMovementsClient } from "./stock-movements-client";
import { api } from "@/trpc/server";

export default async function StockMovementsPage() {
  const session = await auth();
  if (session?.user?.role !== "OWNER") redirect("/pos");

  const data = await api.stockMovements.getAll({ page: 1, pageSize: 25 });

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Log Mutasi Stok</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat pergerakan barang masuk dan keluar (Audit Trail).
          </p>
        </div>
      </div>
      <StockMovementsClient initialData={data} />
    </div>
  );
}
