"use client";

import { useActionState, useState, useEffect } from "react";
import { createProduct, updateProduct, archiveProduct, restoreProduct } from "./actions";
import { useRouter } from "next/navigation";
import { Plus, PencilSimple, Archive, ArrowUUpLeft, Image as ImageIcon } from "@phosphor-icons/react";
import { PageTransition } from "@/components/ui/page-transition";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
const emptyState = { success: false, message: "", errors: {} as Record<string, string[]> };

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

type DrawerProps = {
  product?: Product | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
};

function ProductDrawer({ product, categories, isOpen, onClose }: DrawerProps) {
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
  const [isUploading, setIsUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState(product?.imageUrl ?? "");

  // Reset imgUrl when product changes
  useEffect(() => {
    if (isOpen) {
      setImgUrl(product?.imageUrl ?? "");
    }
  }, [product, isOpen]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setImgUrl(data.url);
        toast.success("Gambar berhasil diupload");
      } else {
        toast.error("Gagal mengupload gambar");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengupload gambar");
    } finally {
      setIsUploading(false);
    }
  }

  // Close on success
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      onClose();
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state.success, state.message, onClose, router]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "New Product" : "Edit Product"}</SheetTitle>
          <SheetDescription>
            {isNew ? "Add a new product to your inventory." : "Update the details of this product."}
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <label htmlFor="p-name" className="text-sm font-medium">Product Name *</label>
              <Input id="p-name" name="name" required defaultValue={product?.name} />
              {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="p-sku" className="text-sm font-medium">SKU *</label>
              <Input id="p-sku" name="sku" required defaultValue={product?.sku} className="font-price" />
              {state.errors?.sku && <p className="text-xs text-destructive">{state.errors.sku[0]}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="p-barcode" className="text-sm font-medium">Barcode</label>
              <Input id="p-barcode" name="barcode" defaultValue={product?.barcode ?? ""} className="font-price" />
            </div>

            <div className="space-y-2">
              <label htmlFor="p-price" className="text-sm font-medium">Selling Price (Rp) *</label>
              <Input id="p-price" name="price" type="number" min="0" step="1" required defaultValue={product ? Number(product.price) : ""} className="font-price" />
              {state.errors?.price && <p className="text-xs text-destructive">{state.errors.price[0]}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="p-costPrice" className="text-sm font-medium">Cost Price (Rp)</label>
              <Input id="p-costPrice" name="costPrice" type="number" min="0" step="1" defaultValue={product?.costPrice ? Number(product.costPrice) : ""} className="font-price" />
            </div>

            <div className="space-y-2">
              <label htmlFor="p-stock" className="text-sm font-medium">Stock</label>
              <Input id="p-stock" name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className="font-price" />
            </div>

            <div className="space-y-2">
              <label htmlFor="p-lowStock" className="text-sm font-medium">Low Stock Alert</label>
              <Input id="p-lowStock" name="lowStockThreshold" type="number" min="0" defaultValue={product?.lowStockThreshold ?? ""} placeholder="Use shop default" className="font-price" />
            </div>

            <div className="col-span-2 space-y-2">
              <label htmlFor="p-category" className="text-sm font-medium">Category</label>
              <Select name="categoryId" defaultValue={product?.categoryId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No category —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-3">
              <label className="text-sm font-medium">Gambar Produk (Opsional)</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                  {imgUrl ? (
                    <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} weight="duotone" className="text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading || isPending}
                    className="cursor-pointer"
                  />
                  <input type="hidden" name="imageUrl" value={imgUrl} />
                  {isUploading && <p className="text-xs text-primary font-medium animate-pulse">Mengupload...</p>}
                </div>
              </div>
              {state.errors?.imageUrl && <p className="text-xs text-destructive">{state.errors.imageUrl[0]}</p>}
            </div>
          </div>

          <SheetFooter className="mt-8 flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}


export function ProductsClient({ products, categories, showArchived }: Props) {
  const [drawerProduct, setDrawerProduct] = useState<Product | null | undefined>(undefined);
  const router = useRouter();

  async function handleArchive(id: string) {
    const res = await archiveProduct(id);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
    router.refresh();
  }

  async function handleRestore(id: string) {
    const res = await restoreProduct(id);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
    router.refresh();
  }

  return (
    <PageTransition className="space-y-6">
      {!showArchived && (
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => setDrawerProduct(null)}
            className="font-bold shadow-sm"
          >
            <Plus size={20} weight="bold" className="mr-2" /> Tambah Produk
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center text-base text-muted-foreground">
            {showArchived ? "Tidak ada produk yang diarsipkan." : "Belum ada produk. Klik “Tambah Produk” untuk memulai."}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[300px]">Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const lowStockLevel = p.lowStockThreshold;
                const isLow = lowStockLevel !== null && p.stock <= lowStockLevel;

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} weight="duotone" className="text-muted-foreground/50" />
                        )}
                      </div>
                      <span className="line-clamp-2 leading-tight">{p.name}</span>
                    </TableCell>
                    <TableCell className="font-price text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.category?.name ?? <span className="italic text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-price font-semibold">{formatIDR(Number(p.price))}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-price font-bold ${isLow ? "text-warning" : ""}`}>
                        {p.stock}
                      </span>
                      {isLow && (
                        <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/20">
                          Hampir Habis
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!showArchived ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDrawerProduct(p)}
                              className="font-semibold text-muted-foreground hover:text-foreground"
                            >
                              <PencilSimple size={18} weight="duotone" className="mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(p.id)}
                              className="font-semibold text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                              <Archive size={18} weight="duotone" className="mr-1" /> Arsip
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(p.id)}
                            className="font-semibold text-primary hover:text-primary/80 hover:bg-primary/10"
                          >
                            <ArrowUUpLeft size={18} weight="duotone" className="mr-1" /> Pulihkan
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ProductDrawer
        product={drawerProduct}
        categories={categories}
        isOpen={drawerProduct !== undefined}
        onClose={() => setDrawerProduct(undefined)}
      />
    </PageTransition>
  );
}
