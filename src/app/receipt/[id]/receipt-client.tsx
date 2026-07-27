"use client";

import { useEffect } from "react";

export function ReceiptClient({ transaction }: { transaction: any }) {
  useEffect(() => {
    // Automatically trigger print dialog when component mounts
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen bg-white text-black font-mono p-4 mx-auto max-w-[80mm] print:p-0 print:m-0 print:max-w-none">
      {/* Receipt Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase">{transaction.shop.name}</h1>
        {transaction.shop.address && (
          <p className="text-sm whitespace-pre-wrap mt-1">{transaction.shop.address}</p>
        )}
        {transaction.shop.phone && (
          <p className="text-sm mt-1">{transaction.shop.phone}</p>
        )}
        {transaction.shop.receiptHeader && (
          <p className="text-sm mt-2">{transaction.shop.receiptHeader}</p>
        )}
      </div>

      <div className="text-xs mb-4 pb-4 border-b border-dashed border-black/30 space-y-1">
        <div className="flex justify-between">
          <span>No: {transaction.transactionNumber}</span>
          <span>{new Date(transaction.createdAt).toLocaleDateString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir: {transaction.cashier.name}</span>
          <span>{new Date(transaction.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4 pb-4 border-b border-dashed border-black/30">
        {transaction.items.map((item: any) => (
          <div key={item.id} className="text-sm">
            <div className="font-semibold">{item.productName}</div>
            <div className="flex justify-between mt-0.5 text-xs">
              <span>{item.quantity} x {formatIDR(Number(item.unitPrice))}</span>
              <span>{formatIDR(Number(item.subtotal))}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="text-sm space-y-1 mb-4 pb-4 border-b border-dashed border-black/30">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatIDR(Number(transaction.subtotal))}</span>
        </div>
        {Number(transaction.discountAmount) > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatIDR(Number(transaction.discountAmount))}</span>
          </div>
        )}
        {Number(transaction.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span>Pajak ({Number(transaction.taxRate)}%)</span>
            <span>{formatIDR(Number(transaction.taxAmount))}</span>
          </div>
        )}
        {Number(transaction.shippingCost) > 0 && (
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{formatIDR(Number(transaction.shippingCost))}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-black/10">
          <span>Total</span>
          <span>{formatIDR(Number(transaction.total))}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="text-sm space-y-1 mb-6">
        <div className="flex justify-between">
          <span>Metode Bayar</span>
          <span>{transaction.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>Tunai</span>
          <span>{formatIDR(Number(transaction.amountPaid))}</span>
        </div>
        <div className="flex justify-between">
          <span>Kembalian</span>
          <span>{formatIDR(Number(transaction.changeDue))}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs space-y-2">
        {transaction.shop.receiptFooter && (
          <p className="whitespace-pre-wrap">{transaction.shop.receiptFooter}</p>
        )}
        <p>Terima Kasih Atas Kunjungan Anda</p>
      </div>
      
      {/* Print styles block to ensure background and layout work properly in print mode */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 0;
            size: 80mm 297mm; /* standard 80mm roll size, length doesn't matter much for roll */
          }
        }
      `}} />
    </div>
  );
}
