"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { voidTransaction, exportTransactionsCsv } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, Column } from "@/components/ui/data-table";
import { toast } from "@/lib/toast";

type Transaction = {
  id: string;
  transactionNumber: string;
  status: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  amountPaid: number;
  changeDue: number;
  note: string | null;
  createdAt: Date;
  cashier: { name: string };
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

type Props = {
  transactions: Transaction[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(d));
}

export function TransactionsClient({ transactions, totalCount, currentPage, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [restock, setRestock] = useState(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  const columns: Column<any>[] = [
    { header: "No", className: "w-[50px] text-center", cell: (_, idx) => <span className="font-medium text-center block">{idx + 1 + (currentPage - 1) * pageSize}</span> },
    { header: "Txn ID", className: "whitespace-nowrap font-medium text-center", accessorKey: "transactionNumber" },
    { header: "Date", className: "whitespace-nowrap text-muted-foreground", cell: (tx) => formatDate(tx.createdAt) },
    { header: "Cashier", className: "whitespace-nowrap text-muted-foreground", cell: (tx) => tx.cashier.name },
    { header: "Items", className: "whitespace-nowrap text-center font-medium", cell: (tx) => tx.items.reduce((acc: any, item: any) => acc + item.quantity, 0) },
    { header: "Method", className: "whitespace-nowrap text-center", cell: (tx) => <div className="flex justify-center"><Badge variant="secondary" className="font-medium">{tx.paymentMethod}</Badge></div> },
    { 
      header: "Status", 
      className: "whitespace-nowrap text-center",
      cell: (tx) => (
        <div className="flex justify-center">
          <Badge
            variant={tx.status === "COMPLETED" ? "default" : tx.status === "CANCELLED" ? "destructive" : "outline"}
            className={tx.status === "COMPLETED" ? "bg-success/10 text-success hover:bg-success/20 border-transparent shadow-none" : tx.status === "CANCELLED" ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent shadow-none" : "bg-warning/10 text-warning hover:bg-warning/20 border-transparent shadow-none"}
          >
            {tx.status}
          </Badge>
        </div>
      )
    },
    { header: "Total", className: "whitespace-nowrap text-right font-price font-semibold", cell: (tx) => formatIDR(tx.total) },
  ];

  function updateFilter(key: string, value: string | null | undefined) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`?${params.toString()}`);
  }

  function openVoidDialog(id: string) {
    setVoidTargetId(id);
    setRestock(true);
    setVoidDialogOpen(true);
  }

  async function confirmVoid() {
    if (!voidTargetId) return;
    setIsVoiding(voidTargetId);
    const id = voidTargetId;
    setVoidDialogOpen(false);

    const res = await voidTransaction(id, restock);
    if (!res.success) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
    }
    setIsVoiding(null);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const csv = await exportTransactionsCsv(
        searchParams.get("startDate") || undefined,
        searchParams.get("endDate") || undefined,
        searchParams.get("status") || undefined
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error(err.message || "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end bg-card p-5 rounded-2xl border flex-shrink-0 shadow-sm">
        <div className="flex flex-col gap-1.5 w-40">
          <label className="text-xs font-medium text-muted-foreground">Dari Tanggal</label>
          <Input
            type="date"
            value={searchParams.get("startDate") || ""}
            onChange={(e) => updateFilter("startDate", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 w-40">
          <label className="text-xs font-medium text-muted-foreground">Sampai Tanggal</label>
          <Input
            type="date"
            value={searchParams.get("endDate") || ""}
            onChange={(e) => updateFilter("endDate", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select
            value={searchParams.get("status") || "ALL"}
            onValueChange={(val) => updateFilter("status", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Voided / Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(searchParams.get("startDate") || searchParams.get("endDate") || searchParams.get("status")) && (
          <Button
            variant="ghost"
            onClick={() => router.push("/transactions")}
            className="text-muted-foreground hover:text-foreground mb-0.5"
          >
            Clear Filters
          </Button>
        )}
        <div className="ml-auto mb-0.5">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Mengekspor..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        isLoading={false}
        emptyMessage="No transactions found."
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: totalCount,
          onPageChange: (page) => updateFilter("page", String(page))
        }}
        expandable={{
          expandedId,
          onExpand: (id) => setExpandedId(expandedId === id ? null : id),
          renderExpanded: (tx) => (
            <div className="p-6 flex gap-8">
              {/* Items List */}
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Order Items</h4>
                <div className="space-y-2">
                  {tx.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.productName} <span className="text-muted-foreground text-xs ml-1">({formatIDR(item.unitPrice)})</span>
                      </span>
                      <span className="font-price text-muted-foreground">{formatIDR(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                {tx.note && (
                  <div className="mt-5 pt-5 border-t border-border/50">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Notes</h4>
                    <p className="text-sm italic text-muted-foreground">{tx.note}</p>
                  </div>
                )}
              </div>
              {/* Financial Summary */}
              <div className="w-72 bg-background p-5 rounded-2xl border shadow-sm space-y-2 text-sm self-start">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-price">{formatIDR(tx.subtotal)}</span>
                </div>
                {tx.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span className="font-price">−{formatIDR(tx.discountAmount)}</span>
                  </div>
                )}
                {tx.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="font-price">{formatIDR(tx.taxAmount)}</span>
                  </div>
                )}
                {tx.shippingCost > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="font-price">{formatIDR(tx.shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-3 mt-3 border-t border-border text-base">
                  <span>Total</span>
                  <span className="font-price text-primary">{formatIDR(tx.total)}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid ({tx.paymentMethod})</span>
                    <span className="font-price">{formatIDR(tx.amountPaid)}</span>
                  </div>
                  {tx.changeDue > 0 && (
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Change</span>
                      <span className="font-price">{formatIDR(tx.changeDue)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="secondary" 
                    className="w-full font-medium"
                    onClick={() => window.open(`/receipt/${tx.id}`, '_blank')}
                  >
                    Cetak Struk
                  </Button>
                </div>
              </div>
              {/* Actions */}
              {tx.status === "COMPLETED" && (
                <div className="w-40 self-start">
                  <Button
                    variant="destructive"
                    onClick={(e) => { e.stopPropagation(); openVoidDialog(tx.id); }}
                    disabled={isVoiding === tx.id}
                    className="w-full text-xs"
                  >
                    {isVoiding === tx.id ? "Voiding…" : "Void Transaction"}
                  </Button>
                </div>
              )}
            </div>
          )
        }}
      />

      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This action will cancel the transaction and refund the amount.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="restock"
              checked={restock}
              onCheckedChange={(checked) => setRestock(checked as boolean)}
            />
            <label
              htmlFor="restock"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Restock items (Return to inventory)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmVoid}>
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
