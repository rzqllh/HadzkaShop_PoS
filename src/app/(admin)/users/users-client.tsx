"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
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
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password minimal 6 karakter jika diisi",
  }),
  role: z.enum(["OWNER", "CASHIER"]),
}).refine(data => {
  // If editing, password is optional. If creating, it's required.
  // We'll handle this loosely since Zod refine across fields can be tricky for forms.
  return true;
});

export function UsersClient() {
  const { data: users, isLoading } = api.users.getAll.useQuery();
  const utils = api.useUtils();
  const [sessionUser, setSessionUser] = useState<any>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user);
    });
  }, []);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
    },
  });

  const createMutation = api.users.create.useMutation({
    onSuccess: () => {
      toast.success("Pengguna berhasil ditambahkan");
      utils.users.getAll.invalidate();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.users.update.useMutation({
    onSuccess: () => {
      toast.success("Pengguna berhasil diubah");
      utils.users.getAll.invalidate();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = api.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Pengguna berhasil dinonaktifkan");
      utils.users.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateMutation.mutate({ 
        id: editingId, 
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password || undefined
      });
    } else {
      if (!values.password) {
        form.setError("password", { message: "Password wajib diisi untuk pengguna baru" });
        return;
      }
      createMutation.mutate({
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password,
      });
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "", // Don't populate password
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Nonaktifkan pengguna ini? Mereka tidak akan bisa login lagi.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openNewDialog = () => {
    setEditingId(null);
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
    });
    setIsOpen(true);
  };

  const columns: Column<any>[] = [
    { 
      header: "No", 
      className: "w-[50px] text-center", 
      cell: (_, idx) => <span className="font-medium text-center block">{idx + 1}</span> 
    },
    { header: "Nama", className: "font-medium", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { 
      header: "Role", 
      className: "text-center", 
      cell: (user) => (
        <div className="flex justify-center">
          <Badge variant={user.role === "OWNER" ? "default" : "secondary"}>
            {user.role === "OWNER" ? "Owner" : "Kasir"}
          </Badge>
        </div>
      ) 
    },
    { 
      header: "Aksi", 
      className: "w-[180px] text-center", 
      cell: (user) => (
        <div className="flex justify-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEdit(user)}
            aria-label={`Ubah ${user.name}`}
          >
            <Pencil className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Ubah</span>
          </Button>
          {user.email !== sessionUser?.email && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(user.id)}
              aria-label={`Nonaktifkan ${user.name}`}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Hapus</span>
            </Button>
          )}
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pengguna
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Ubah Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Untuk Login)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="budi@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASHIER">Kasir</SelectItem>
                            <SelectItem value="OWNER">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{editingId ? "Password Baru" : "Password"}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        {editingId && (
                          <FormDescription>Kosongkan jika tidak ingin mengubah</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
      </div>

      <DataTable 
        columns={columns} 
        data={users || []} 
        isLoading={isLoading} 
        emptyMessage="Belum ada pengguna lainnya." 
      />
    </div>
  );
}
