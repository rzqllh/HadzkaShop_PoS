"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { voidTransaction } from "./actions";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`?${params.toString()}`);
  }

  async function handleVoid(id: string) {
    if (!confirm("Are you sure you want to void this transaction? Stock will be restocked.")) return;
    setIsVoiding(id);
    setErrorMsg(null);
    const res = await voidTransaction(id);
    if (!res.success) {
      setErrorMsg(res.message);
    }
    setIsVoiding(null);
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-3 rounded-lg border border-border flex-shrink-0">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-muted-foreground">Date</label>
          <input
            type="date"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={searchParams.get("date") || ""}
            onChange={(e) => updateFilter("date", e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-muted-foreground">Status</label>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={searchParams.get("status") || ""}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Voided / Cancelled</option>
          </select>
        </div>
        {(searchParams.get("date") || searchParams.get("status")) && (
          <button
            onClick={() => router.push("/transactions")}
            className="mt-5 text-sm text-muted-foreground hover:text-foreground touch-target px-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-md px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 flex-shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden flex flex-col min-h-0 flex-1">
        <div className="overflow-auto flex-1 bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Txn ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Cashier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Method</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      className="hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium">{tx.transactionNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.cashier.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          tx.status === "COMPLETED" ? "bg-success/10 text-success" :
                          tx.status === "CANCELLED" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-price font-semibold">
                        {formatIDR(tx.total)}
                      </td>
                    </tr>
                    {expandedId === tx.id && (
                      <tr className="bg-muted/10">
                        <td colSpan={6} className="p-0 border-b border-border">
                          <div className="p-4 flex gap-6">
                            {/* Items List */}
                            <div className="flex-1 space-y-2">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Order Items</h4>
                              <div className="space-y-1">
                                {tx.items.map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span>
                                      {item.quantity}x {item.productName} <span className="text-muted-foreground text-xs">({formatIDR(item.unitPrice)})</span>
                                    </span>
                                    <span className="font-price text-muted-foreground">{formatIDR(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                              {tx.note && (
                                <div className="mt-4 pt-4 border-t border-border">
                                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</h4>
                                  <p className="text-sm italic">{tx.note}</p>
                                </div>
                              )}
                            </div>
                            {/* Financial Summary */}
                            <div className="w-64 bg-card p-3 rounded border border-border shadow-sm space-y-1 text-sm self-start">
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
                              <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
                                <span>Total</span>
                                <span className="font-price text-primary">{formatIDR(tx.total)}</span>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-border space-y-1 text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Paid ({tx.paymentMethod})</span>
                                  <span className="font-price">{formatIDR(tx.amountPaid)}</span>
                                </div>
                                {tx.changeDue > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Change</span>
                                    <span className="font-price">{formatIDR(tx.changeDue)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Actions */}
                            {tx.status === "COMPLETED" && (
                              <div className="w-32 self-start">
                                <button
                                  onClick={() => handleVoid(tx.id)}
                                  disabled={isVoiding === tx.id}
                                  className="w-full text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded py-2 transition-colors disabled:opacity-50 touch-target"
                                >
                                  {isVoiding === tx.id ? "Voiding…" : "Void Transaction"}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to Math.min(currentPage * pageSize, totalCount) of {totalCount}
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => updateFilter("page", String(currentPage - 1))}
                className="px-3 py-1 rounded border border-border text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => updateFilter("page", String(currentPage + 1))}
                className="px-3 py-1 rounded border border-border text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
