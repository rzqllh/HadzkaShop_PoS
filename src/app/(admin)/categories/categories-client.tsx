"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

export function CategoriesClient() {
  const { data: categories, isLoading } = api.categories.getAll.useQuery();
  const utils = api.useUtils();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const createMutation = api.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil ditambahkan");
      utils.categories.getAll.invalidate();
      setIsOpen(false);
      setName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil diubah");
      utils.categories.getAll.invalidate();
      setIsOpen(false);
      setEditingId(null);
      setName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = api.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      utils.categories.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, name: name.trim() });
    } else {
      createMutation.mutate({ name: name.trim() });
    }
  };

  const handleEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus kategori ini? Pastikan tidak ada produk yang menggunakan kategori ini.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openNewDialog = () => {
    setEditingId(null);
    setName("");
    setIsOpen(true);
  };

  const columns: Column<any>[] = [
    { 
      header: "No", 
      className: "w-[50px] text-center", 
      cell: (_, idx) => <span className="font-medium text-center block">{idx + 1}</span> 
    },
    { header: "Nama Kategori", className: "font-medium", accessorKey: "name" },
    { 
      header: "Aksi", 
      className: "w-[150px] text-center", 
      cell: (cat) => (
        <div className="flex justify-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleEdit(cat.id, cat.name)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(cat.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) 
    }
  ];

  if (isLoading) return <div className="p-4">Memuat kategori...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kategori
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Ubah Kategori" : "Tambah Kategori Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Kategori</label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Mis. Makanan, Minuman" 
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={categories || []} 
        isLoading={isLoading} 
        emptyMessage="Belum ada kategori." 
      />
    </div>
  );
}
