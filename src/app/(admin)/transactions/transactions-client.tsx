"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { voidTransaction } from "./actions";
import { PageTransition } from "@/components/ui/page-transition";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

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

  const totalPages = Math.ceil(totalCount / pageSize);

  function updateFilter(key: string, value: string | null | undefined) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`?${params.toString()}`);
  }

  async function handleVoid(id: string) {
    if (!confirm("Are you sure you want to void this transaction? Stock will be restocked.")) return;
    setIsVoiding(id);
    const res = await voidTransaction(id);
    if (!res.success) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
    }
    setIsVoiding(null);
  }

  return (
    <PageTransition className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end bg-card p-4 rounded-lg border border-border flex-shrink-0 shadow-sm">
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            value={searchParams.get("date") || ""}
            onChange={(e) => updateFilter("date", e.target.value)}
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
        {(searchParams.get("date") || searchParams.get("status")) && (
          <Button
            variant="ghost"
            onClick={() => router.push("/transactions")}
            className="text-muted-foreground hover:text-foreground mb-0.5"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden flex flex-col min-h-0 flex-1 shadow-sm bg-card">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="whitespace-nowrap">Txn ID</TableHead>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Cashier</TableHead>
                <TableHead className="whitespace-nowrap">Method</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <TableRow
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      className="cursor-pointer hover:bg-accent/30"
                    >
                      <TableCell className="font-medium">{tx.transactionNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.cashier.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {tx.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.status === "COMPLETED" ? "default" : tx.status === "CANCELLED" ? "destructive" : "outline"}
                          className={tx.status === "COMPLETED" ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : tx.status === "CANCELLED" ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent" : "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-price font-semibold">
                        {formatIDR(tx.total)}
                      </TableCell>
                    </TableRow>
                    {expandedId === tx.id && (
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={6} className="p-0 border-b border-border">
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
                            <div className="w-72 bg-background p-4 rounded-lg border border-border shadow-sm space-y-2 text-sm self-start">
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
                            </div>
                            {/* Actions */}
                            {tx.status === "COMPLETED" && (
                              <div className="w-40 self-start">
                                <Button
                                  variant="destructive"
                                  onClick={() => handleVoid(tx.id)}
                                  disabled={isVoiding === tx.id}
                                  className="w-full text-xs"
                                >
                                  {isVoiding === tx.id ? "Voiding…" : "Void Transaction"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => updateFilter("page", String(currentPage - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => updateFilter("page", String(currentPage + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
