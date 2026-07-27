"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui/page-transition";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
};

type Props = { categories: Category[] };

const emptyState = { success: false, message: "", errors: {} as Record<string, string[]> };

export function CategoriesClient({ categories }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const router = useRouter();

  const [createState, createAction, isCreating] = useActionState(createCategory, emptyState);
  const [updateState, updateAction, isUpdating] = useActionState(
    updateCategory.bind(null, editingId ?? ""),
    emptyState
  );

  useEffect(() => {
    if (createState.success) {
      toast.success(createState.message);
      setShowNewForm(false);
    } else if (createState.message) {
      toast.error(createState.message);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState.success) {
      toast.success(updateState.message);
      setEditingId(null);
    } else if (updateState.message) {
      toast.error(updateState.message);
    }
  }, [updateState]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    const res = await deleteCategory(id);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <PageTransition className="space-y-4">
      {/* New Category Form */}
      {showNewForm ? (
        <form
          id="create-cat-form"
          action={createAction}
          className="border rounded-2xl p-6 space-y-4 bg-card shadow-sm"
        >
          <h2 className="text-sm font-semibold">New Category</h2>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="new-name" className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input
                id="new-name"
                name="name"
                required
                autoFocus
                placeholder="e.g. Beverages"
              />
              {createState.errors?.name && (
                <p className="text-xs text-destructive">{createState.errors.name[0]}</p>
              )}
            </div>
            <div className="w-24 space-y-1">
              <label htmlFor="new-sortOrder" className="text-xs font-medium text-muted-foreground">Order</label>
              <Input
                id="new-sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={0}
                className="font-price"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isCreating}
              size="sm"
            >
              {isCreating ? "Saving…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowNewForm(true)}
          variant="outline"
          className="border-dashed"
        >
          <Plus size={16} weight="bold" className="mr-2" /> Add Category
        </Button>
      )}

      {/* Category List */}
      <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories yet. Add one above to organise your products.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center w-24">Order</TableHead>
                <TableHead className="text-center w-24">Products</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) =>
                editingId === cat.id ? (
                  <TableRow key={cat.id} className="bg-accent/30">
                    <TableCell colSpan={4} className="p-3">
                      <form
                        action={updateAction}
                        className="flex items-center gap-3"
                      >
                        <Input
                          name="name"
                          defaultValue={cat.name}
                          required
                          autoFocus
                          className="flex-1"
                        />
                        <Input
                          name="sortOrder"
                          type="number"
                          defaultValue={cat.sortOrder}
                          className="w-20 font-price text-center"
                        />
                        <Button
                          type="submit"
                          disabled={isUpdating}
                          size="sm"
                        >
                          {isUpdating ? "…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                      {updateState.errors?.name && (
                        <p className="text-xs text-destructive mt-1">{updateState.errors.name[0]}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-center font-price text-muted-foreground">{cat.sortOrder}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {cat._count.products}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(cat.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <PencilSimple size={16} weight="duotone" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cat.id)}
                          disabled={cat._count.products > 0}
                          title={cat._count.products > 0 ? "Reassign products first" : "Delete category"}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        >
                          <Trash size={16} weight="duotone" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </PageTransition>
  );
}
