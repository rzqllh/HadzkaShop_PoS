"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const { data: settings, isLoading } = api.shop.getSettings.useQuery();
  const utils = api.useUtils();
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    taxRate: 0,
    lowStockThreshold: 10,
    receiptHeader: "",
    receiptFooter: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name,
        address: settings.address || "",
        phone: settings.phone || "",
        taxRate: settings.taxRate,
        lowStockThreshold: settings.lowStockThreshold,
        receiptHeader: settings.receiptHeader || "",
        receiptFooter: settings.receiptFooter || "",
      });
    }
  }, [settings]);

  const updateMutation = api.shop.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Pengaturan berhasil disimpan");
      utils.shop.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pengaturan Toko</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi toko dan konfigurasi POS.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Toko</Label>
            <Input 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Alamat</Label>
            <Textarea 
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pajak / Tax Rate (%)</Label>
              <Input 
                type="number" 
                min="0" max="100" step="0.1" 
                value={formData.taxRate} 
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ambang Batas Stok Rendah (Low Stock)</Label>
              <Input 
                type="number" 
                min="0" 
                value={formData.lowStockThreshold} 
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 0 })} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Header Struk (Opsional)</Label>
            <Textarea 
              value={formData.receiptHeader} 
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })} 
              placeholder="Terima kasih telah berbelanja!"
            />
          </div>

          <div className="space-y-2">
            <Label>Footer Struk (Opsional)</Label>
            <Textarea 
              value={formData.receiptFooter} 
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })} 
              placeholder="Barang yang sudah dibeli tidak dapat ditukar."
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
