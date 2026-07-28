"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/toast";
import { Plus, Pencil, Trash2, Search, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  categoryId: z.string().nullable().optional(),
  initialStock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
});

const adjustStockSchema = z.object({
  type: z.enum(["ADD", "SUBTRACT", "SET"]),
  quantity: z.number().int().min(0, "Jumlah tidak boleh negatif"),
  reason: z.string().min(1, "Alasan wajib diisi"),
});

export function ProductsClient() {
  const { data: products, isLoading: isLoadingProducts } = api.products.getAll.useQuery();
  const { data: categories } = api.categories.getAll.useQuery();
  const utils = api.useUtils();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustStockId, setAdjustStockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      categoryId: "none",
      initialStock: 0,
      lowStockThreshold: 10,
    },
  });

  const adjustForm = useForm<z.infer<typeof adjustStockSchema>>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      type: "ADD",
      quantity: 0,
      reason: "",
    },
  });

  const createMutation = api.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produk berhasil ditambahkan");
      utils.products.getAll.invalidate();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produk berhasil diubah");
      utils.products.getAll.invalidate();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = api.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produk berhasil dihapus (soft delete)");
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const adjustMutation = api.products.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("Stok berhasil disesuaikan");
      utils.products.getAll.invalidate();
      setAdjustStockId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      categoryId: values.categoryId === "none" ? null : values.categoryId,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);
    }
  };

  const onAdjustSubmit = (values: z.infer<typeof adjustStockSchema>) => {
    if (adjustStockId) {
      adjustMutation.mutate({ id: adjustStockId, ...values });
    }
  };

  const handleEdit = (product: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      categoryId: product.categoryId || "none",
      initialStock: product.stock, // Just for form, won't be sent in update
      lowStockThreshold: product.lowStockThreshold || 10,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus produk ini? Transaksi sebelumnya yang menggunakan produk ini tidak akan terpengaruh.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openNewDialog = () => {
    setEditingId(null);
    form.reset({
      name: "",
      sku: "",
      price: 0,
      categoryId: "none",
      initialStock: 0,
      lowStockThreshold: 10,
    });
    setIsOpen(true);
  };

  const openAdjustDialog = (product: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setAdjustStockId(product.id);
    adjustForm.reset({
      type: "ADD",
      quantity: 0,
      reason: "",
    });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>[] = [
    { header: "No", className: "w-[50px] text-center", cell: (_, idx) => <span className="font-medium text-center block">{idx + 1}</span> },
    { header: "SKU", className: "font-mono text-xs text-center", accessorKey: "sku" },
    { header: "Nama Produk", className: "font-medium", accessorKey: "name" },
    { header: "Kategori", cell: (product) => product.category?.name || "-" },
    { 
      header: "Harga", 
      className: "text-right font-price", 
      cell: (product) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(product.price)) 
    },
    { 
      header: "Stok", 
      className: "text-center", 
      cell: (product) => (
        <div className="flex justify-center">
          <Badge variant={product.stock <= (product.lowStockThreshold || 0) ? "destructive" : "secondary"}>
            {product.stock}
          </Badge>
        </div>
      ) 
    },
    { 
      header: "Aksi", 
      className: "w-[180px] text-center whitespace-nowrap", 
      cell: (product) => (
        <div className="flex justify-center space-x-2">
          <Button 
            variant="outline" size="sm" 
            onClick={() => openAdjustDialog(product)}
            aria-label={`Sesuaikan Stok ${product.name}`} title="Sesuaikan Stok"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" size="sm" 
            onClick={() => handleEdit(product)}
            aria-label={`Ubah ${product.name}`} title="Ubah Produk"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" size="sm" 
            className="text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(product.id)}
            aria-label={`Hapus ${product.name}`} title="Hapus Produk"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau SKU..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Ubah Produk" : "Tambah Produk Baru"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Produk</FormLabel>
                        <FormControl>
                          <Input placeholder="Kopi Susu..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="KS-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Jual</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Tanpa Kategori</SelectItem>
                            {categories?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!editingId && (
                  <FormField
                    control={form.control}
                    name="initialStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stok Awal</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormDescription>Bisa dikosongkan jika belum ada stok.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batas Stok Menipis</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription>Peringatan akan muncul jika stok di bawah angka ini.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Adjust Stock Dialog */}
        <Dialog open={!!adjustStockId} onOpenChange={(open) => !open && setAdjustStockId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sesuaikan Stok</DialogTitle>
            </DialogHeader>
            <Form {...adjustForm}>
              <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={adjustForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Penyesuaian</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ADD">Tambah Stok</SelectItem>
                          <SelectItem value="SUBTRACT">Kurangi Stok</SelectItem>
                          <SelectItem value="SET">Setel Stok Akhir</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah / Nilai</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alasan</FormLabel>
                      <FormControl>
                        <Input placeholder="Misal: Stok masuk, Barang rusak..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAdjustStockId(null)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={adjustMutation.isPending}>
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredProducts || []} 
        isLoading={isLoadingProducts} 
        emptyMessage="Tidak ada produk ditemukan." 
      />
    </div>
  );
}
