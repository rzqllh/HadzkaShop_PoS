"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/toast";
import { Plus, Pencil, Trash2, Eye, Receipt } from "lucide-react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { formatIDR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().optional(),
});

export function CustomersClient({ shopId }: { shopId: string }) {
  const { data: customers, isLoading } = api.customers.getAll.useQuery({ shopId });
  const utils = api.useUtils();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const createMutation = api.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.getAll.invalidate();
      setIsOpen(false);
      form.reset();
      toast.success("Pelanggan berhasil ditambahkan");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.getAll.invalidate();
      setIsOpen(false);
      setEditingId(null);
      form.reset();
      toast.success("Pelanggan berhasil diperbarui");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = api.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.getAll.invalidate();
      toast.success("Pelanggan berhasil dihapus");
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...values });
    } else {
      createMutation.mutate({ shopId, ...values });
    }
  }

  const { data: selectedCustomer } = api.customers.getById.useQuery(
    { id: selectedCustomerId! },
    { enabled: !!selectedCustomerId && historyOpen }
  );

  const columns: Column<any>[] = [
    {
      header: "Nama",
      accessorKey: "name",
    },
    {
      header: "Kontak",
      cell: (row) => (
        <div className="flex flex-col text-sm text-muted-foreground">
          <span>{row.phone || "-"}</span>
          <span>{row.email || ""}</span>
        </div>
      ),
    },
    {
      header: "Poin Loyalitas",
      cell: (row) => (
        <Badge variant="secondary" className="font-bold text-primary">
          {row.loyaltyPoints} Pts
        </Badge>
      ),
    },
    {
      header: "Total Belanja",
      cell: (row) => <span className="font-medium">{formatIDR(Number(row.totalSpent))}</span>,
    },
    {
      header: "Aksi",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCustomerId(row.id);
              setHistoryOpen(true);
            }}
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingId(row.id);
              form.reset({
                name: row.name,
                phone: row.phone || "",
                email: row.email || "",
                address: row.address || "",
              });
              setIsOpen(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Hapus pelanggan ini?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      <div className="flex justify-end mb-4 flex-shrink-0">
        <Button className="shadow-sm" onClick={() => {
          setEditingId(null);
          form.reset();
          setIsOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pelanggan
        </Button>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingId(null);
            form.reset();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="Budi Santoso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor HP</FormLabel>
                      <FormControl>
                        <Input placeholder="0812xxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="budi@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Jl. Sudirman No 1..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Simpan Perubahan" : "Tambah Pelanggan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={customers || []} isLoading={isLoading} />

      {/* Transaction History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Transaksi Pelanggan</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer ? (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nama Pelanggan</p>
                  <p className="text-lg font-bold">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Poin</p>
                  <Badge className="text-base">{selectedCustomer.loyaltyPoints} Pts</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kontak</p>
                  <p className="text-sm">{selectedCustomer.phone || "Tidak ada nomor HP"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Belanja</p>
                  <p className="text-sm font-bold text-primary">{formatIDR(Number(selectedCustomer.totalSpent))}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Transaksi Terakhir</h3>
                {selectedCustomer.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCustomer.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Receipt size={20} />
                          </div>
                          <div>
                            <p className="font-medium">{tx.transactionNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatIDR(Number(tx.total))}</p>
                          <Badge variant="outline">{tx.paymentMethod}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat transaksi.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Memuat data pelanggan...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
