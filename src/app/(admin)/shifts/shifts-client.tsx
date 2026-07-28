"use client";

import { api } from "@/trpc/react";
import { DataTable, Column } from "@/components/ui/data-table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ShiftsClient() {
  const { data: shifts, isLoading } = api.shifts.getAll.useQuery();

  const columns: Column<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>[] = [
    { 
      header: "No", 
      className: "w-[50px] text-center", 
      cell: (_, idx) => <span className="font-medium text-center block">{idx + 1}</span> 
    },
    { 
      header: "Kasir", 
      className: "font-medium", 
      cell: (shift) => shift.cashier.name 
    },
    { 
      header: "Dibuka", 
      cell: (shift) => format(new Date(shift.openedAt), "dd/MM/yyyy HH:mm") 
    },
    { 
      header: "Ditutup", 
      cell: (shift) => shift.closedAt ? format(new Date(shift.closedAt), "dd/MM/yyyy HH:mm") : "-" 
    },
    { 
      header: "Modal Awal", 
      className: "text-right font-price", 
      cell: (shift) => formatIDR(Number(shift.startingCash)) 
    },
    { 
      header: "Kas Sistem", 
      className: "text-right font-price", 
      cell: (shift) => shift.expectedCash ? formatIDR(Number(shift.expectedCash)) : "-" 
    },
    { 
      header: "Kas Laci", 
      className: "text-right font-price", 
      cell: (shift) => shift.actualCash ? formatIDR(Number(shift.actualCash)) : "-" 
    },
    { 
      header: "Selisih", 
      className: "text-right font-price font-bold", 
      cell: (shift) => (
        <span className={Number(shift.difference) < 0 ? 'text-destructive' : Number(shift.difference) > 0 ? 'text-success' : 'text-muted-foreground'}>
          {shift.difference !== null ? formatIDR(Number(shift.difference)) : "-"}
        </span>
      ) 
    },
    { 
      header: "Status", 
      className: "text-center", 
      cell: (shift) => (
        <div className="flex justify-center">
          {shift.status === "OPEN" ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-warning/10 text-warning border-warning/20">
              OPEN
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-success/10 text-success border-success/20">
              CLOSED
            </span>
          )}
        </div>
      ) 
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sesi Kasir (Shift)</h1>
        <p className="text-base text-muted-foreground mt-2">
          Riwayat pembukaan dan penutupan kasir beserta selisih kas.
        </p>
      </div>

      <DataTable 
        columns={columns} 
        data={shifts || []} 
        isLoading={isLoading} 
        emptyMessage="Belum ada riwayat sesi kasir." 
      />
    </div>
  );
}
