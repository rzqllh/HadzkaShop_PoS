"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { submitTransaction } from "./actions";
import { MagnifyingGlass, ShoppingCart, Trash, Plus, Minus, Money, QrCode, Bank } from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────
type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number | null;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
};
type CartItem = { product: Product; qty: number };
type Shop = {
  name: string;
  taxRate: any;
  currency: string;
  lowStockThreshold: number;
};

type Props = {
  shop: Shop;
  products: Product[];
  categories: Category[];
  cashierName: string;
  cashierRole: string;
  hasOpenTill: boolean;
  tillOpenedAt: string | null;
};

// ── Helpers ────────────────────────────────────────────
function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER";

// ── POS Terminal ───────────────────────────────────────
export function POSTerminal({ shop, products, categories, cashierName, cashierRole, hasOpenTill, tillOpenedAt }: Props) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxOverride, setTaxOverride] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashTendered, setCashTendered] = useState("");
  const [note, setNote] = useState("");

  // UI state
  const [searchQ, setSearchQ] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  // Till state
  const [isTillOpen, setIsTillOpen] = useState(hasOpenTill);
  const [showCloseTillModal, setShowCloseTillModal] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [tillNote, setTillNote] = useState("");
  const [tillError, setTillError] = useState<string | null>(null);

  // Derived values
  const defaultTaxRate = Number(shop.taxRate ?? 0);
  const taxRate = taxOverride ?? defaultTaxRate;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const taxAmount = Math.round((subtotal - discountAmount) * (taxRate / 100));
  const total = subtotal - discountAmount + taxAmount + shippingCost;
  const cashTenderedNum = parseFloat(cashTendered.replace(/[^0-9.]/g, "")) || 0;
  const changeDue = cashTenderedNum - total;

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategoryId !== "all") {
      list = list.filter((p) => p.category?.id === activeCategoryId);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategoryId, searchQ]);

  // Cart actions
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountAmount(0);
    setTaxOverride(null);
    setShippingCost(0);
    setCashTendered("");
    setNote("");
    setCheckoutOpen(false);
    setTxResult(null);
  }, []);

  // Submit transaction
  function handleSubmit(method: PaymentMethod) {
    setPaymentMethod(method);
    if (cart.length === 0) return;

    startTransition(async () => {
      // Lazy import to keep the client bundle smaller if possible, or just use normal import.
      const { submitTransaction } = await import("./actions");
      const result = await submitTransaction({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.qty,
          unitPrice: i.product.price,
          productName: i.product.name,
        })),
        discountAmount,
        taxRate,
        taxAmount,
        shippingCost,
        subtotal,
        total,
        paymentMethod: method,
        amountPaid: method === "CASH" ? cashTenderedNum : total,
        note,
      });

      setTxResult(result);
      if (result.success) {
        // Stay on success screen briefly, then reset
        setTimeout(clearCart, 3000);
      }
    });
  }

  // Till actions
  function handleOpenTill(e: React.FormEvent) {
    e.preventDefault();
    setTillError(null);
    startTransition(async () => {
      const { openTillSession } = await import("./till-actions");
      const res = await openTillSession(Number(startingCash) || 0);
      if (res.success) {
        setIsTillOpen(true);
      } else {
        setTillError(res.message);
      }
    });
  }

  function handleCloseTill(e: React.FormEvent) {
    e.preventDefault();
    setTillError(null);
    startTransition(async () => {
      const { closeTillSession } = await import("./till-actions");
      const res = await closeTillSession(Number(actualCash) || 0, tillNote);
      if (res.success) {
        setShowCloseTillModal(false);
        setIsTillOpen(false);
        setStartingCash("");
      } else {
        setTillError(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Till Overlay */}
      {!isTillOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-lg shadow-xl p-6 border border-border">
            <h2 className="text-2xl font-bold mb-2">Buka Kasir</h2>
            <p className="text-base text-muted-foreground mb-6">Masukkan modal awal (uang kas) untuk memulai.</p>
            {tillError && (
              <div role="alert" className="mb-4 rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                {tillError}
              </div>
            )}
            <form onSubmit={handleOpenTill} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="startingCash" className="text-sm font-medium">Starting Cash (Rp)</label>
                <input
                  id="startingCash"
                  type="number"
                  required
                  min="0"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-price text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-md bg-primary text-primary-foreground text-lg font-bold py-4 hover:bg-primary/90 disabled:opacity-50 transition-colors touch-target"
              >
                {isPending ? "Membuka…" : "Buka Kasir"}
              </button>
              {cashierRole === "OWNER" && (
                <div className="pt-2 text-center">
                  <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                    Kembali ke Ringkasan
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Close Till Modal */}
      {showCloseTillModal && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Close Till</h2>
              <button onClick={() => setShowCloseTillModal(false)} className="text-muted-foreground hover:text-foreground touch-target px-2">✕</button>
            </div>
            <form onSubmit={handleCloseTill} className="p-4 space-y-4">
              {tillError && (
                <div role="alert" className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                  {tillError}
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="actualCash" className="text-sm font-medium">Actual Cash in Drawer (Rp)</label>
                <input
                  id="actualCash"
                  type="number"
                  required
                  min="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-price text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="tillNote" className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  id="tillNote"
                  value={tillNote}
                  onChange={(e) => setTillNote(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-md bg-destructive text-destructive-foreground text-sm font-medium py-2.5 hover:bg-destructive/90 disabled:opacity-50 transition-colors touch-target"
              >
                {isPending ? "Closing…" : "Confirm & Close Till"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">{shop.name}</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {cashierName} · {cashierRole}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isTillOpen && (
            <button
              onClick={() => { setTillError(null); setShowCloseTillModal(true); setActualCash(""); setTillNote(""); }}
              className="text-sm text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-md border border-destructive/30 touch-target font-semibold"
            >
              Tutup Kasir
            </button>
          )}
          {cashierRole === "OWNER" && (
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md touch-target border border-border ml-2 font-semibold"
            >
              Admin Panel ↗
            </Link>
          )}
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Product Panel ────────────────────── */}
        <div className="flex flex-col flex-[6] overflow-hidden border-r border-border">
          {/* Search + Category filter */}
          <div className="flex-shrink-0 p-4 space-y-3 border-b border-border bg-card">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} weight="duotone" />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cari produk atau SKU…"
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Cari produk"
              />
            </div>
            {/* Category tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategoryId("all")}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors touch-target ${
                    activeCategoryId === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors touch-target ${
                      activeCategoryId === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No products found.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map((p) => {
                  const inCart = cart.find((i) => i.product.id === p.id);
                  const isLow =
                    p.lowStockThreshold != null && p.stock <= p.lowStockThreshold;
                  const outOfStock = p.stock === 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => !outOfStock && addToCart(p)}
                      disabled={outOfStock}
                      className={`
                        relative flex flex-col text-left rounded-lg border p-2.5 transition-colors
                        min-h-[80px] touch-target
                        ${outOfStock
                          ? "opacity-40 cursor-not-allowed border-border bg-muted/30"
                          : inCart
                          ? "border-primary bg-primary/5 hover:bg-primary/10"
                          : "border-border bg-card hover:bg-accent/50 active:scale-[0.98]"
                        }
                      `}
                      aria-label={`Add ${p.name} to cart`}
                    >
                      <span className="font-medium text-sm leading-tight line-clamp-2">{p.name}</span>
                      <span className="mt-auto pt-1 font-price text-sm font-semibold text-primary">
                        {formatIDR(p.price)}
                      </span>
                      {isLow && !outOfStock && (
                        <span className="absolute top-1.5 right-1.5 text-[10px] font-medium text-warning leading-none">
                          low
                        </span>
                      )}
                      {outOfStock && (
                        <span className="absolute top-1.5 right-1.5 text-[10px] font-medium text-destructive leading-none">
                          sold out
                        </span>
                      )}
                      {inCart && (
                        <span className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart Panel ──────────────────────── */}
        <div className="flex flex-col flex-[4] overflow-hidden bg-card">
          {/* Success overlay */}
          {txResult?.success && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-success/10 border-2 border-success rounded-lg m-2">
              <div className="text-4xl mb-2">✓</div>
              <p className="font-semibold text-success text-lg">Payment Complete</p>
              <p className="text-sm text-muted-foreground mt-1">Resetting in 3s…</p>
            </div>
          )}

          {/* Cart header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} weight="duotone" className="text-primary" />
              <span className="font-bold text-xl">Keranjang</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-2 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-md touch-target border border-destructive/20 hover:bg-destructive/5"
              >
                <Trash size={18} weight="duotone" />
                Kosongkan
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart size={48} weight="duotone" className="mb-4 opacity-50" />
                <p className="text-base">Belum ada produk di keranjang.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold leading-tight line-clamp-2">{item.product.name}</p>
                      <p className="text-sm text-primary font-price mt-1">{formatIDR(item.product.price)}</p>
                    </div>
                    {/* Qty stepper */}
                    <div className="flex items-center gap-3 flex-shrink-0 bg-accent/30 rounded-lg p-1 border border-border">
                      <button
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="h-12 w-12 rounded-md bg-background border border-border flex items-center justify-center text-lg hover:bg-accent transition-colors touch-target shadow-sm"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus size={20} weight="bold" />
                      </button>
                      <span className="w-10 text-center text-lg font-price font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="h-12 w-12 rounded-md bg-background border border-border flex items-center justify-center text-lg hover:bg-accent transition-colors touch-target shadow-sm"
                        aria-label="Tambah jumlah"
                      >
                        <Plus size={20} weight="bold" />
                      </button>
                    </div>
                    <span className="w-24 text-right text-lg font-price font-bold flex-shrink-0">
                      {formatIDR(item.product.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Inputs */}
          <div className="flex-shrink-0 border-t-2 border-border p-6 bg-accent/5 space-y-4">
            {/* Totals summary */}
            <div className="space-y-2 text-base">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-medium">Subtotal</span>
                <span className="font-price font-semibold">{formatIDR(subtotal)}</span>
              </div>
              
              {/* Discount Input */}
              <div className="flex items-center justify-between text-success gap-4 mt-2">
                <label htmlFor="discount" className="font-medium flex-shrink-0">Diskon (Rp)</label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-32 rounded border border-input bg-background px-3 py-2 text-base font-price font-bold text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                />
              </div>

              {/* Tax Input */}
              <div className="flex items-center justify-between text-muted-foreground gap-4 mt-2">
                <label htmlFor="taxOverride" className="font-medium flex-shrink-0">
                  Pajak (%)
                </label>
                <input
                  id="taxOverride"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxOverride ?? defaultTaxRate}
                  onChange={(e) => setTaxOverride(Number(e.target.value))}
                  className="w-24 rounded border border-input bg-background px-3 py-2 text-base font-price font-bold text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                />
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span className="text-sm">Nilai Pajak</span>
                  <span className="font-price font-medium">{formatIDR(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-2xl pt-4 border-t border-border mt-4">
                <span>Total Bayar</span>
                <span className="font-price text-primary">{formatIDR(total)}</span>
              </div>
            </div>

            {/* Cash tendered (only if CASH) */}
            {checkoutOpen && paymentMethod === "CASH" && (
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="cash" className="font-bold text-lg flex-shrink-0">Uang Diterima</label>
                  <input
                    id="cash"
                    type="number"
                    min={total}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={formatIDR(total)}
                    className="flex-1 max-w-[200px] rounded-lg border-2 border-primary bg-background px-4 py-3 text-xl font-price font-bold text-right focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                    autoFocus
                  />
                </div>
                {cashTenderedNum >= total && (
                  <div className="flex justify-between text-lg font-bold text-success pt-2">
                    <span>Kembalian</span>
                    <span className="font-price">{formatIDR(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {txResult && !txResult.success && (
              <div role="alert" className="rounded-md px-4 py-3 text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 mt-4">
                {txResult.message}
              </div>
            )}

            {/* Payment buttons */}
            <div className="pt-4">
              {!checkoutOpen ? (
                <button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={cart.length === 0}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-5 text-xl font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Lanjut Pembayaran
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSubmit("CASH")}
                    disabled={isPending || cart.length === 0 || (paymentMethod === "CASH" && cashTenderedNum < total)}
                    className="rounded-xl bg-success text-success-foreground py-4 text-lg font-bold hover:bg-success/90 disabled:opacity-40 transition-colors shadow flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Money size={28} weight="duotone" />
                    {isPending && paymentMethod === "CASH" ? "..." : "Tunai"}
                  </button>
                  <button
                    onClick={() => handleSubmit("QRIS")}
                    disabled={isPending || cart.length === 0}
                    className="rounded-xl bg-primary text-primary-foreground py-4 text-lg font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors shadow flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <QrCode size={28} weight="duotone" />
                    {isPending && paymentMethod === "QRIS" ? "..." : "QRIS"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
