"use client";

import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { MagnifyingGlass, ShoppingCart, Trash, Money, QrCode, Bell } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/pos/product-card";
import { CartLineItem } from "@/components/pos/cart-line-item";

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
  taxRate: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  currency: string;
  lowStockThreshold: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  loyaltyPoints: number;
};

type Props = {
  shop: Shop;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  cashierName: string;
  cashierRole: string;
  qrisEnabled: boolean;
  qrisDisabledReason: string;
};

// ── Helpers ────────────────────────────────────────────
function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

type PaymentMethod = "CASH" | "QRIS";
type PendingPayment = {
  transactionId: string;
  status: string;
  snapToken?: string;
};

// ── POS Terminal ───────────────────────────────────────
export function POSTerminal({
  shop,
  products,
  categories,
  customers,
  cashierName,
  cashierRole,
  qrisEnabled,
  qrisDisabledReason,
}: Props) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock <= (shop.lowStockThreshold || 0)).length;
  }, [products, shop.lowStockThreshold]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxOverride, setTaxOverride] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashTendered, setCashTendered] = useState("");
  const [note, setNote] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("none");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientRequestIdRef = useRef<string | null>(null);
  const openedSnapTokenRef = useRef<string | null>(null);

  // UI state
  const [searchQ, setSearchQ] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !checkoutOpen) {
          setCheckoutOpen(true);
        }
      } else if (e.key === "Escape") {
        if (checkoutOpen) {
          setCheckoutOpen(false);
        }
      } else if (e.key === "F3" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, checkoutOpen]);


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
    setPaymentMethod("CASH");
    setCashTendered("");
    setNote("");
    setTxResult(null);
    setPendingPayment(null);
    setCheckoutOpen(false);
    setSelectedCustomerId("none");
    clientRequestIdRef.current = null;
    openedSnapTokenRef.current = null;
  }, []);

  const syncPaymentStatus = useCallback(async (transactionId: string) => {
    await fetch(`/api/transactions/${transactionId}/status`, {
      method: "POST",
    });
  }, []);

  const openSnap = useCallback(
    (payment: PendingPayment) => {
      if (
        !payment.snapToken ||
        !window.snap ||
        openedSnapTokenRef.current === payment.snapToken
      ) {
        return;
      }

      openedSnapTokenRef.current = payment.snapToken;
      const sync = () => void syncPaymentStatus(payment.transactionId);
      window.snap.pay(payment.snapToken, {
        onSuccess: sync,
        onPending: sync,
        onError: sync,
        onClose: sync,
      });
    },
    [syncPaymentStatus],
  );

  useEffect(() => {
    if (
      !pendingPayment ||
      !["CREATING_PAYMENT", "PENDING"].includes(pendingPayment.status)
    ) {
      return;
    }

    openSnap(pendingPayment);
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/transactions/${pendingPayment.transactionId}/status`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const current = (await response.json()) as {
          status: string;
          snapToken?: string | null;
        };
        const nextPayment = {
          transactionId: pendingPayment.transactionId,
          status: current.status,
          snapToken: current.snapToken ?? pendingPayment.snapToken,
        };
        setPendingPayment(nextPayment);
        openSnap(nextPayment);

        if (current.status === "COMPLETED") {
          setTxResult({
            success: true,
            message: "Pembayaran QRIS terverifikasi.",
          });
          window.setTimeout(clearCart, 3000);
        } else if (
          ["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(current.status)
        ) {
          clientRequestIdRef.current = null;
          openedSnapTokenRef.current = null;
          setTxResult({
            success: false,
            message: "Pembayaran QRIS tidak selesai. Reservasi stok sudah dilepas.",
          });
        }
      } catch {
        // Poll berikutnya menangani gangguan jaringan sementara.
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [clearCart, openSnap, pendingPayment]);

  // Submit transaction
  function handleSubmit(method: PaymentMethod) {
    setPaymentMethod(method);
    if (cart.length === 0) return;

    startTransition(async () => {
      clientRequestIdRef.current ??= crypto.randomUUID();
      // Lazy import to keep the client bundle smaller if possible, or just use normal import.
      const { submitTransaction } = await import("./actions");
      const result = await submitTransaction({
        clientRequestId: clientRequestIdRef.current,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.qty,
        })),
        discount:
          discountAmount > 0
            ? { type: "FIXED", value: String(discountAmount) }
            : null,
        taxRateOverride:
          taxOverride === null ? null : String(taxOverride),
        shippingCost: String(shippingCost),
        paymentMethod: method,
        amountPaid: method === "CASH" ? String(cashTenderedNum) : undefined,
        note,
        customerId: selectedCustomerId !== "none" ? selectedCustomerId : undefined,
      });

      setTxResult(result);
      if (
        method === "QRIS" &&
        result.success &&
        result.transactionId &&
        result.status
      ) {
        const payment = {
          transactionId: result.transactionId,
          status: result.status,
          snapToken: result.snapToken,
        };
        setTxResult(null);
        setPendingPayment(payment);
        openSnap(payment);
      } else if (result.success) {
        setTimeout(clearCart, 3000);
      } else if (
        method === "QRIS" &&
        result.status &&
        ["FAILED", "CANCELLED", "EXPIRED"].includes(result.status)
      ) {
        clientRequestIdRef.current = null;
      }
    });
  }
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-4 w-1/4">
          <span className="font-bold text-lg">{shop.name}</span>
          <span className="text-sm text-muted-foreground hidden lg:inline truncate">
            {cashierName} · {cashierRole}
          </span>
        </div>
        
        <div className="flex-1 flex justify-center max-w-xl px-4">
          <div className="relative w-full">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} weight="duotone" />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Cari produk atau SKU (F3)…"
              className="w-full pl-10 h-10 text-sm rounded-full bg-muted/50 border-transparent focus-visible:ring-primary transition-shadow focus-visible:bg-background"
              aria-label="Cari produk"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" onClick={() => {}}>
            <Bell size={24} weight="duotone" />
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
            )}
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold shadow-sm hidden sm:flex">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Product Panel ────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border relative z-0">
          {/* Category filter */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card">
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <Button
                  variant={activeCategoryId === "all" ? "default" : "secondary"}
                  className="rounded-md font-semibold transition-all hover:-translate-y-[1px]"
                  onClick={() => setActiveCategoryId("all")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategoryId === cat.id ? "default" : "secondary"}
                    className="rounded-md font-semibold transition-all hover:-translate-y-[1px]"
                    onClick={() => setActiveCategoryId(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
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
          <div className="flex-shrink-0 border-t border-border p-6 bg-secondary space-y-4">
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

            {/* Customer Selection */}
            {checkoutOpen && (
              <div className="pt-4 pb-2 border-b border-border">
                <label className="text-sm font-semibold mb-2 block">Pilih Pelanggan (Opsional)</label>
                <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || "none")}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Pilih pelanggan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tanpa Pelanggan --</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""} - {c.loyaltyPoints} Pts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
            {pendingPayment &&
              ["CREATING_PAYMENT", "PENDING"].includes(pendingPayment.status) && (
                <div
                  role="status"
                  className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary mt-4"
                >
                  Menunggu pembayaran QRIS terverifikasi. Status diperbarui otomatis.
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
                  Lanjut Pembayaran (F2)
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
                    disabled={!qrisEnabled || isPending || cart.length === 0}
                    title={!qrisEnabled ? qrisDisabledReason : undefined}
                    className="h-12 text-base font-bold shadow-sm transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
                  >
                    <QrCode size={24} weight="duotone" className="mr-2" />
                    {isPending && paymentMethod === "QRIS" ? "..." : "QRIS"}
                  </Button>
                </div>
              )}
              {!qrisEnabled && checkoutOpen && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {qrisDisabledReason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
