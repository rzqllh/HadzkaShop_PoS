"use client";

import { useActionState } from "react";
import { updateSettings } from "./actions";
import type { Shop } from "@prisma/client";

type Props = { shop: Omit<Shop, "taxRate"> & { taxRate: number } };

const initialState = { success: false };

export function SettingsForm({ shop }: Props) {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);

  const field = (name: string) => ({
    name,
    id: name,
    "aria-describedby": `${name}-error`,
  });

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          role="alert"
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            state.success
              ? "bg-success/10 text-success border border-success/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Shop Info */}
      <fieldset className="border border-border rounded-lg p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-foreground">Shop Information</legend>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">Shop Name *</label>
          <input
            {...field("name")}
            defaultValue={shop.name}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {state.errors?.name && (
            <p id="name-error" className="text-xs text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium">Phone</label>
            <input
              {...field("phone")}
              defaultValue={shop.phone ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="currency" className="text-sm font-medium">Currency</label>
            <input
              {...field("currency")}
              defaultValue={shop.currency}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-medium">Address</label>
          <textarea
            {...field("address")}
            defaultValue={shop.address ?? ""}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
      </fieldset>

      {/* Tax & Stock */}
      <fieldset className="border border-border rounded-lg p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-foreground">Tax & Stock</legend>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="taxRate" className="text-sm font-medium">Default Tax Rate (%)</label>
            <input
              {...field("taxRate")}
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={Number(shop.taxRate)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-price"
            />
            <p className="text-xs text-muted-foreground">
              Applied to new transactions by default. Can be overridden per transaction.
            </p>
            {state.errors?.taxRate && (
              <p id="taxRate-error" className="text-xs text-destructive">{state.errors.taxRate[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="lowStockThreshold" className="text-sm font-medium">Low Stock Threshold</label>
            <input
              {...field("lowStockThreshold")}
              type="number"
              min="0"
              defaultValue={shop.lowStockThreshold}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-price"
            />
            <p className="text-xs text-muted-foreground">
              Products below this level show a low stock warning.
            </p>
          </div>
        </div>
      </fieldset>

      {/* Receipt */}
      <fieldset className="border border-border rounded-lg p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-foreground">Receipt</legend>

        <div className="space-y-1">
          <label htmlFor="receiptHeader" className="text-sm font-medium">Receipt Header</label>
          <textarea
            {...field("receiptHeader")}
            defaultValue={shop.receiptHeader ?? ""}
            rows={2}
            placeholder="e.g. Thank you for shopping at Hadzka Shop!"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="receiptFooter" className="text-sm font-medium">Receipt Footer</label>
          <textarea
            {...field("receiptFooter")}
            defaultValue={shop.receiptFooter ?? ""}
            rows={2}
            placeholder="e.g. Returns accepted within 7 days with receipt."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary text-primary-foreground font-medium text-sm py-2.5 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
      >
        {isPending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
