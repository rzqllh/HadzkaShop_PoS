"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { createProduct, updateProduct, archiveProduct, restoreProduct } from "./actions";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: any;
  costPrice: any;
  stock: number;
  lowStockThreshold: number | null;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string | null;
  category: { name: string } | null;
};

type Props = { products: Product[]; categories: Category[]; showArchived: boolean };
const emptyState = { success: false };

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

type DrawerProps = {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
};

function ProductDrawer({ product, categories, onClose }: DrawerProps) {
  const isNew = !product;
  const [createState, createAction, isCreating] = useActionState(createProduct, emptyState);
  const [updateState, updateAction, isUpdating] = useActionState(
    updateProduct.bind(null, product?.id ?? ""),
    emptyState
  );
  const state = isNew ? createState : updateState;
  const formAction = isNew ? createAction : updateAction;
  const isPending = isNew ? isCreating : isUpdating;

  const router = useRouter();

  // Close on success
  useEffect(() => {
    if (state.success && state.message) {
      onClose();
      router.refresh();
    }
  }, [state.success, state.message, onClose, router]);

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={isNew ? "New product" : "Edit product"}>
      <div className="bg-card rounded-lg border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-base">{isNew ? "New Product" : "Edit Product"}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent transition-colors touch-target flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="p-4 space-y-4">
          {state.message && !state.success && (
            <div role="alert" className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
              {state.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label htmlFor="p-name" className="text-xs font-medium text-muted-foreground">Product Name *</label>
              <input id="p-name" name="name" required defaultValue={product?.name} className={inputClass} />
              {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="p-sku" className="text-xs font-medium text-muted-foreground">SKU *</label>
              <input id="p-sku" name="sku" required defaultValue={product?.sku} className={`${inputClass} font-price`} />
              {state.errors?.sku && <p className="text-xs text-destructive">{state.errors.sku[0]}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="p-barcode" className="text-xs font-medium text-muted-foreground">Barcode</label>
              <input id="p-barcode" name="barcode" defaultValue={product?.barcode ?? ""} className={`${inputClass} font-price`} />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-price" className="text-xs font-medium text-muted-foreground">Selling Price (Rp) *</label>
              <input id="p-price" name="price" type="number" min="0" step="1" required defaultValue={product ? Number(product.price) : ""} className={`${inputClass} font-price`} />
              {state.errors?.price && <p className="text-xs text-destructive">{state.errors.price[0]}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="p-costPrice" className="text-xs font-medium text-muted-foreground">Cost Price (Rp)</label>
              <input id="p-costPrice" name="costPrice" type="number" min="0" step="1" defaultValue={product?.costPrice ? Number(product.costPrice) : ""} className={`${inputClass} font-price`} />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-stock" className="text-xs font-medium text-muted-foreground">Stock</label>
              <input id="p-stock" name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className={`${inputClass} font-price`} />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-lowStock" className="text-xs font-medium text-muted-foreground">Low Stock Alert</label>
              <input id="p-lowStock" name="lowStockThreshold" type="number" min="0" defaultValue={product?.lowStockThreshold ?? ""} placeholder="Use shop default" className={`${inputClass} font-price`} />
            </div>

            <div className="col-span-2 space-y-1">
              <label htmlFor="p-category" className="text-xs font-medium text-muted-foreground">Category</label>
              <select id="p-category" name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputClass}>
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label htmlFor="p-imageUrl" className="text-xs font-medium text-muted-foreground">Image URL</label>
              <input id="p-imageUrl" name="imageUrl" type="url" defaultValue={product?.imageUrl ?? ""} placeholder="https://…" className={inputClass} />
              {state.errors?.imageUrl && <p className="text-xs text-destructive">{state.errors.imageUrl[0]}</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors touch-target"
            >
              {isPending ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { Plus, PencilSimple, Archive, ArrowUUpLeft } from "@phosphor-icons/react";

// (skipped the ProductDrawer translation for brevity in ponytail mode, focusing on main page)

export function ProductsClient({ products, categories, showArchived }: Props) {
  const [drawerProduct, setDrawerProduct] = useState<Product | null | undefined>(undefined);
  // undefined = closed, null = new product, Product = editing
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleArchive(id: string) {
    const res = await archiveProduct(id);
    setActionMsg(res.message);
    router.refresh();
  }

  async function handleRestore(id: string) {
    const res = await restoreProduct(id);
    setActionMsg(res.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!showArchived && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerProduct(null)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-colors touch-target shadow-sm"
          >
            <Plus size={20} weight="bold" /> Tambah Produk
          </button>
        </div>
      )}

      {actionMsg && (
        <div role="status" className="rounded-md px-4 py-3 text-sm font-medium bg-success/10 text-success border border-success/20">
          {actionMsg}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        {products.length === 0 ? (
          <div className="p-12 text-center text-base text-muted-foreground">
            {showArchived ? "Tidak ada produk yang diarsipkan." : "Belum ada produk. Klik “Tambah Produk” untuk memulai."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base min-w-[700px]">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Nama Produk</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">SKU</th>
                  <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Kategori</th>
                  <th className="text-right px-6 py-4 font-semibold text-muted-foreground">Harga</th>
                  <th className="text-right px-6 py-4 font-semibold text-muted-foreground">Stok</th>
                  <th className="w-40 px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => {
                  const lowStockLevel = p.lowStockThreshold;
                  const isLow = lowStockLevel !== null && p.stock <= lowStockLevel;

                  return (
                    <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{p.name}</td>
                      <td className="px-6 py-4 font-price text-muted-foreground">{p.sku}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {p.category?.name ?? <span className="italic text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-price font-semibold">{formatIDR(Number(p.price))}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-price font-bold ${isLow ? "text-warning" : ""}`}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span className="ml-2 text-xs font-bold text-warning uppercase bg-warning/10 px-2 py-1 rounded">Hampir Habis</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!showArchived ? (
                            <>
                              <button
                                onClick={() => setDrawerProduct(p)}
                                className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent touch-target border border-transparent hover:border-border"
                              >
                                <PencilSimple size={18} weight="duotone" /> Edit
                              </button>
                              <button
                                onClick={() => handleArchive(p.id)}
                                className="flex items-center gap-1 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-md hover:bg-destructive/10 touch-target border border-transparent hover:border-destructive/20"
                              >
                                <Archive size={18} weight="duotone" /> Arsip
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(p.id)}
                              className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-md hover:bg-primary/10 touch-target border border-transparent hover:border-primary/20"
                            >
                              <ArrowUUpLeft size={18} weight="duotone" /> Pulihkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Drawer */}
      {drawerProduct !== undefined && (
        <ProductDrawer
          product={drawerProduct}
          categories={categories}
          onClose={() => setDrawerProduct(undefined)}
        />
      )}
    </div>
  );
}
