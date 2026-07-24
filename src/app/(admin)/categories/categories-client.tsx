"use client";

import { useActionState, useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
};

type Props = { categories: Category[] };

const emptyState = { success: false };

export function CategoriesClient({ categories }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createState, createAction, isCreating] = useActionState(createCategory, emptyState);
  const [updateState, updateAction, isUpdating] = useActionState(
    updateCategory.bind(null, editingId ?? ""),
    emptyState
  );

  async function handleDelete(id: string) {
    setDeleteError(null);
    const res = await deleteCategory(id);
    if (!res.success) setDeleteError(res.message);
  }

  return (
    <div className="space-y-4">
      {/* New Category Form */}
      {showNewForm ? (
        <form
          action={(fd) => {
            createAction(fd);
            if (createState.success) setShowNewForm(false);
          }}
          className="border border-border rounded-lg p-4 space-y-3 bg-card"
        >
          <h2 className="text-sm font-semibold">New Category</h2>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="new-name" className="text-xs font-medium text-muted-foreground">Name *</label>
              <input
                id="new-name"
                name="name"
                required
                autoFocus
                placeholder="e.g. Beverages"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {createState.errors?.name && (
                <p className="text-xs text-destructive">{createState.errors.name[0]}</p>
              )}
            </div>
            <div className="w-24 space-y-1">
              <label htmlFor="new-sortOrder" className="text-xs font-medium text-muted-foreground">Order</label>
              <input
                id="new-sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={0}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-price"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors touch-target"
            >
              {isCreating ? "Saving…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors touch-target"
        >
          <span className="text-lg leading-none">+</span> Add Category
        </button>
      )}

      {deleteError && (
        <div role="alert" className="rounded-md px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
          {deleteError}
        </div>
      )}

      {/* Category List */}
      <div className="border border-border rounded-lg overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories yet. Add one above to organise your products.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">Order</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-24">Products</th>
                <th className="w-32 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) =>
                editingId === cat.id ? (
                  <tr key={cat.id} className="bg-accent/30">
                    <td colSpan={4} className="p-3">
                      <form
                        action={updateAction}
                        className="flex items-center gap-3"
                      >
                        <input
                          name="name"
                          defaultValue={cat.name}
                          required
                          autoFocus
                          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <input
                          name="sortOrder"
                          type="number"
                          defaultValue={cat.sortOrder}
                          className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-price text-center"
                        />
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? "…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                      </form>
                      {updateState.errors?.name && (
                        <p className="text-xs text-destructive mt-1">{updateState.errors.name[0]}</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr key={cat.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 text-center font-price text-muted-foreground">{cat.sortOrder}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {cat._count.products}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(cat.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded"
                          disabled={cat._count.products > 0}
                          title={cat._count.products > 0 ? "Reassign products first" : "Delete category"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
