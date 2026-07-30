"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date(d));
}

export function StockMovementsClient({ initialData }: { initialData: { items: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[], total: number } }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = api.stockMovements.getAll.useQuery(
    { page, pageSize },
    { initialData: page === 1 ? initialData : undefined }
  );

  const movements = data?.items || [];
  const total = data?.total || 0;

  const columns: Column<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>[] = [
    { header: "No", className: "w-[50px] text-center", cell: (_, idx) => <span className="font-medium text-center block">{idx + 1}</span> },
    { header: "Tanggal", className: "whitespace-nowrap text-muted-foreground", cell: (m) => formatDate(m.createdAt) },
    { header: "Produk", className: "whitespace-nowrap font-medium", cell: (m) => <>{m.product.name} <span className="text-muted-foreground font-normal text-xs ml-1">({m.product.sku})</span></> },
    { 
      header: "Tipe", 
      className: "whitespace-nowrap",
      cell: (m) => (
        <Badge
          variant="outline"
          className={
            m.type === "ADD" ? "bg-success/10 text-success border-transparent" :
            m.type === "SUBTRACT" ? "bg-destructive/10 text-destructive border-transparent" :
            m.type === "REFUND" ? "bg-primary/10 text-primary border-transparent" :
            "bg-muted/50 text-muted-foreground border-transparent"
          }
        >
          {m.type}
        </Badge>
      )
    },
    { 
      header: "Mutasi (+/-)", 
      className: "whitespace-nowrap text-center",
      cell: (m) => (
        <span className={`font-bold ${m.quantity > 0 && (m.type === "ADD" || m.type === "REFUND") ? "text-success" : m.type === "SALE" || m.type === "SUBTRACT" ? "text-destructive" : ""}`}>
          {m.type === "SALE" || m.type === "SUBTRACT" ? "-" : "+"}{m.quantity}
        </span>
      )
    },
    { header: "Sisa Stok", className: "whitespace-nowrap text-center font-medium", accessorKey: "newStock" },
    { header: "Alasan", className: "whitespace-nowrap text-muted-foreground max-w-[200px] truncate", cell: (m) => <span title={m.reason}>{m.reason}</span> },
    { header: "Kasir / Admin", className: "whitespace-nowrap text-muted-foreground", cell: (m) => m.user.name },
  ];

  return (
    <DataTable
      columns={columns}
      data={movements}
      isLoading={isLoading}
      emptyMessage="Belum ada riwayat mutasi stok."
      pagination={{
        page,
        pageSize,
        total,
        onPageChange: setPage
      }}
    />
  );
}
