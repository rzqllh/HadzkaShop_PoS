"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  if (isLoading) return <div>Memuat kategori...</div>;

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

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kategori</TableHead>
              <TableHead className="w-[150px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  Belum ada kategori.
                </TableCell>
              </TableRow>
            )}
            {categories?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-right space-x-2">
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
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
