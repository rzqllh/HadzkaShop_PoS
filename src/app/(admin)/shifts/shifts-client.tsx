"use client";

import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sesi Kasir (Shift)</h1>
        <p className="text-base text-muted-foreground mt-2">
          Riwayat pembukaan dan penutupan kasir beserta selisih kas.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : !shifts || shifts.length === 0 ? (
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Belum ada riwayat sesi kasir.</p>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-card flex flex-col min-h-0 flex-1">
          <div className="overflow-auto flex-1">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[50px] text-center">No</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>Dibuka</TableHead>
                <TableHead>Ditutup</TableHead>
                <TableHead className="text-right">Modal Awal</TableHead>
                <TableHead className="text-right">Kas Sistem</TableHead>
                <TableHead className="text-right">Kas Laci</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Memuat sesi...</TableCell>
                </TableRow>
              ) : !shifts || shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Tidak ada histori sesi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift, index) => (
                  <TableRow key={shift.id} className="even:bg-muted/30">
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell className="font-medium">{shift.cashier.name}</TableCell>
                    <TableCell>{format(new Date(shift.openedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      {shift.closedAt ? format(new Date(shift.closedAt), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-price">{formatIDR(Number(shift.startingCash))}</TableCell>
                    <TableCell className="text-right font-price">
                      {shift.expectedCash ? formatIDR(Number(shift.expectedCash)) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-price">
                      {shift.actualCash ? formatIDR(Number(shift.actualCash)) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-price font-bold">
                      <span className={Number(shift.difference) < 0 ? 'text-destructive' : Number(shift.difference) > 0 ? 'text-success' : 'text-muted-foreground'}>
                        {shift.difference !== null ? formatIDR(Number(shift.difference)) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {shift.status === "OPEN" ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-warning/10 text-warning border-warning/20">
                          OPEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-success/10 text-success border-success/20">
                          CLOSED
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}
    </div>
  );
}
