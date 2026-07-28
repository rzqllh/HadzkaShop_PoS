"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date(d));
}

export function StockMovementsClient({ initialData }: { initialData: { items: any[], total: number } }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = api.stockMovements.getAll.useQuery(
    { page, pageSize },
    { initialData: page === 1 ? initialData : undefined }
  );

  const movements = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="border rounded-2xl overflow-hidden flex flex-col min-h-0 flex-1 bg-card">
      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[50px] text-center">No</TableHead>
              <TableHead className="whitespace-nowrap">Tanggal</TableHead>
              <TableHead className="whitespace-nowrap">Produk</TableHead>
              <TableHead className="whitespace-nowrap">Tipe</TableHead>
              <TableHead className="whitespace-nowrap text-center">Mutasi (+/-)</TableHead>
              <TableHead className="whitespace-nowrap text-center">Sisa Stok</TableHead>
              <TableHead className="whitespace-nowrap">Alasan</TableHead>
              <TableHead className="whitespace-nowrap">Kasir / Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Belum ada riwayat mutasi stok.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m: any, index: number) => (
                <TableRow key={m.id} className="hover:bg-accent/30 even:bg-muted/30">
                  <TableCell className="font-medium text-center">{index + 1 + (page - 1) * pageSize}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="font-medium">{m.product.name} <span className="text-muted-foreground font-normal text-xs ml-1">({m.product.sku})</span></TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className={`text-center font-bold ${m.quantity > 0 && (m.type === "ADD" || m.type === "REFUND") ? "text-success" : m.type === "SALE" || m.type === "SUBTRACT" ? "text-destructive" : ""}`}>
                    {m.type === "SALE" || m.type === "SUBTRACT" ? "-" : "+"}{m.quantity}
                  </TableCell>
                  <TableCell className="text-center font-medium">{m.newStock}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate" title={m.reason}>{m.reason}</TableCell>
                  <TableCell className="text-muted-foreground">{m.user.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <span className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * pageSize + 1} hingga {Math.min(page * pageSize, total)} dari {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1 || isLoading} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages || isLoading} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
