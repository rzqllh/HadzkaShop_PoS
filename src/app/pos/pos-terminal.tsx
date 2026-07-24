"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { submitTransaction } from "./actions";
import { MagnifyingGlass, ShoppingCart, Trash, Money, QrCode } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ProductCard } from "@/components/pos/product-card";
import { CartLineItem } from "@/components/pos/cart-line-item";
import { PageTransition } from "@/components/ui/page-transition";

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
        if (existing.qty >= product.stock) return prev; // Cannot exceed stock
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      if (product.stock < 1) return prev;
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => {
        return prev.map((i) => {
          if (i.product.id === productId) {
            const cappedQty = Math.min(qty, i.product.stock);
            return { ...i, qty: cappedQty };
          }
          return i;
        });
      });
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
    <PageTransition className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Till Overlay */}
      <Dialog open={!isTillOpen}>
        <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Buka Kasir</DialogTitle>
            <DialogDescription>
              Masukkan modal awal (uang kas) untuk memulai shift ini.
            </DialogDescription>
          </DialogHeader>
          {tillError && (
            <div role="alert" className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
              {tillError}
            </div>
          )}
          <form onSubmit={handleOpenTill} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="startingCash" className="text-sm font-medium">Starting Cash (Rp)</label>
              <Input
                id="startingCash"
                type="number"
                required
                min="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0"
                autoFocus
                className="font-price text-lg"
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0 mt-6">
              <Button type="submit" disabled={isPending} className="w-full text-lg font-bold py-6">
                {isPending ? "Membuka…" : "Buka Kasir"}
              </Button>
              {cashierRole === "OWNER" && (
                <Link href="/dashboard" className="text-sm text-center text-muted-foreground hover:text-foreground mt-2">
                  Kembali ke Ringkasan
                </Link>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Till Modal */}
      <Dialog open={showCloseTillModal} onOpenChange={setShowCloseTillModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tutup Kasir</DialogTitle>
            <DialogDescription>
              Pastikan jumlah uang tunai di laci sesuai dengan perhitungan sistem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseTill} className="space-y-4 pt-4">
            {tillError && (
              <div role="alert" className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                {tillError}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="actualCash" className="text-sm font-medium">Actual Cash in Drawer (Rp)</label>
              <Input
                id="actualCash"
                type="number"
                required
                min="0"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0"
                className="font-price text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tillNote" className="text-sm font-medium">Notes (Optional)</label>
              <Input
                id="tillNote"
                value={tillNote}
                onChange={(e) => setTillNote(e.target.value)}
                placeholder="Catatan penutupan..."
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCloseTillModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? "Closing…" : "Confirm & Close Till"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setTillError(null); setShowCloseTillModal(true); setActualCash(""); setTillNote(""); }}
              className="text-destructive hover:text-destructive/80 border-destructive/30 font-semibold"
            >
              Tutup Kasir
            </Button>
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
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border relative z-0">
          {/* Search + Category filter */}
          <div className="flex-shrink-0 p-6 space-y-4 border-b border-border bg-card/80 backdrop-blur-md">
            <div className="relative max-w-xl">
              <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={22} weight="duotone" />
              <Input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cari produk atau SKU…"
                className="w-full pl-12 h-12 text-base rounded-xl bg-background/80 shadow-sm border-border focus-visible:ring-primary transition-shadow"
                aria-label="Cari produk"
              />
            </div>
            {/* Category tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <Button
                  variant={activeCategoryId === "all" ? "default" : "secondary"}
                  className="rounded-xl font-semibold transition-all hover:-translate-y-[1px]"
                  onClick={() => setActiveCategoryId("all")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategoryId === cat.id ? "default" : "secondary"}
                    className="rounded-xl font-semibold transition-all hover:-translate-y-[1px]"
                    onClick={() => setActiveCategoryId(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-background/50">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <MagnifyingGlass size={64} weight="duotone" className="mb-4 opacity-20" />
                <p className="text-lg">No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                {filteredProducts.map((p) => {
                  const inCart = cart.find((i) => i.product.id === p.id);
                  return (
                    <ProductCard
                      key={p.id}
                      product={p}
                      inCartQty={inCart?.qty}
                      onAddToCart={addToCart}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart Panel ──────────────────────── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-card border-l border-border relative z-10">
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
              <Button
                variant="destructive"
                size="sm"
                onClick={clearCart}
                className="flex items-center gap-2 font-semibold shadow-sm"
              >
                <Trash size={18} weight="duotone" />
                Kosongkan
              </Button>
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
                  <CartLineItem
                    key={item.product.id}
                    item={item}
                    onUpdateQty={updateQty}
                  />
                ))}
              </div>
            )}
          </div>

            {/* Totals + Inputs */}
          <div className="flex-shrink-0 border-t border-border p-6 bg-card/50 space-y-4">
            {/* Totals summary */}
            <div className="space-y-3 text-base">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-medium">Subtotal</span>
                <span className="font-price font-semibold">{formatIDR(subtotal)}</span>
              </div>
              
              {/* Discount Input */}
              <div className="flex items-center justify-between text-success gap-4 mt-2">
                <label htmlFor="discount" className="font-medium flex-shrink-0">Diskon (Rp)</label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-32 text-right font-price font-bold bg-background shadow-sm"
                />
              </div>

              {/* Tax Input */}
              <div className="flex items-center justify-between text-muted-foreground gap-4 mt-2">
                <label htmlFor="taxOverride" className="font-medium flex-shrink-0">
                  Pajak (%)
                </label>
                <Input
                  id="taxOverride"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxOverride ?? defaultTaxRate}
                  onChange={(e) => setTaxOverride(Number(e.target.value))}
                  className="w-24 text-right font-price font-bold bg-background shadow-sm"
                />
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span className="text-sm">Nilai Pajak</span>
                  <span className="font-price font-medium">{formatIDR(taxAmount)}</span>
                </div>
              )}

              {/* Shipping Input */}
              <div className="flex items-center justify-between text-muted-foreground gap-4 mt-2">
                <label htmlFor="shipping" className="font-medium flex-shrink-0">Ongkir (Rp)</label>
                <Input
                  id="shipping"
                  type="number"
                  min="0"
                  value={shippingCost || ""}
                  onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-32 text-right font-price font-bold bg-background shadow-sm"
                />
              </div>

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
                  <Input
                    id="cash"
                    type="number"
                    min={total}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={formatIDR(total)}
                    className="flex-1 max-w-[200px] text-xl font-price font-bold text-right"
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
                <Button
                  size="lg"
                  onClick={() => setCheckoutOpen(true)}
                  disabled={cart.length === 0}
                  className="w-full h-12 text-base font-bold shadow-sm transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
                >
                  Lanjut Pembayaran
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    onClick={() => handleSubmit("CASH")}
                    disabled={isPending || cart.length === 0 || (paymentMethod === "CASH" && cashTenderedNum < total)}
                    className="h-12 text-base font-bold bg-success text-success-foreground hover:bg-success/90 shadow-sm transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
                  >
                    <Money size={24} weight="duotone" className="mr-2" />
                    {isPending && paymentMethod === "CASH" ? "..." : "Tunai"}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleSubmit("QRIS")}
                    disabled={isPending || cart.length === 0}
                    className="h-12 text-base font-bold shadow-sm transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
                  >
                    <QrCode size={24} weight="duotone" className="mr-2" />
                    {isPending && paymentMethod === "QRIS" ? "..." : "QRIS"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
