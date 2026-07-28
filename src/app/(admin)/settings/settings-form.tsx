"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/trpc/react";
import { toast } from "@/lib/toast";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(1, "Nama toko wajib diisi"),
  address: z.string().optional(),
  phone: z.string().optional(),
  taxRate: z.number().min(0, "Pajak minimal 0").max(100, "Pajak maksimal 100"),
  lowStockThreshold: z.number().min(0, "Minimal 0"),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
});

export function SettingsForm() {
  const { data: settings, isLoading } = api.shop.getSettings.useQuery();
  const utils = api.useUtils();

  const updateSettings = api.shop.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Pengaturan toko berhasil disimpan.");
      utils.shop.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal menyimpan pengaturan.");
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      taxRate: 0,
      lowStockThreshold: 10,
      receiptHeader: "",
      receiptFooter: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name,
        address: settings.address || "",
        phone: settings.phone || "",
        taxRate: Number(settings.taxRate),
        lowStockThreshold: settings.lowStockThreshold,
        receiptHeader: settings.receiptHeader || "",
        receiptFooter: settings.receiptFooter || "",
      });
    }
  }, [settings, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateSettings.mutate(values);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Dasar</CardTitle>
        <CardDescription>
          Data ini akan ditampilkan pada struk pelanggan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Toko</FormLabel>
                  <FormControl>
                    <Input placeholder="Hadzka Shop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="0812..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pajak / PPN (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormDescription>
                      Set ke 0 jika tidak ada pajak.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="lowStockThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batas Stok Menipis</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                  </FormControl>
                  <FormDescription>
                    Peringatan akan muncul jika stok produk berada di bawah angka ini.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Lengkap</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alamat toko..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptHeader"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Struk</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Pesan di bagian atas struk..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptFooter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Struk</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Pesan di bagian bawah struk (mis: Terima kasih)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSettings.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
