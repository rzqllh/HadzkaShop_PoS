"use client";

import { useActionState, useEffect } from "react";
import { updateSettings } from "./actions";
import type { Shop } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";

type Props = { shop: Omit<Shop, "taxRate"> & { taxRate: number } };

const initialState = { success: false, message: "", errors: {} as Record<string, string[]> };

const formVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.4, ease: "easeOut" }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export function SettingsForm({ shop }: Props) {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);

  const field = (name: string) => ({
    name,
    id: name,
    "aria-describedby": `${name}-error`,
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state.success, state.message]);

  return (
    <motion.form 
      action={formAction} 
      className="space-y-8 pb-12"
      initial="hidden"
      animate="visible"
      variants={formVariants}
    >
      <motion.div variants={itemVariants} className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Shop Information</h2>
        <p className="text-sm text-muted-foreground">The primary details identifying your business on receipts and POS.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border-b border-border/40 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="name" className="text-sm font-medium">Shop Name</label>
            <p className="text-xs text-muted-foreground">The name displayed on the POS.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Input {...field("name")} defaultValue={shop.name} required />
            {state.errors?.name && <p id="name-error" className="text-xs text-destructive mt-1.5">{state.errors.name[0]}</p>}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border-b border-border/40 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
            <p className="text-xs text-muted-foreground">Used for customer inquiries.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Input {...field("phone")} defaultValue={shop.phone ?? ""} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border-b border-border/40 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="currency" className="text-sm font-medium">Currency</label>
            <p className="text-xs text-muted-foreground">Default base currency symbol.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Input {...field("currency")} defaultValue={shop.currency} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between p-5 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="address" className="text-sm font-medium">Address</label>
            <p className="text-xs text-muted-foreground">Physical location of your store.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Textarea {...field("address")} defaultValue={shop.address ?? ""} rows={3} className="resize-none" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-1 pt-4">
        <h2 className="text-xl font-semibold tracking-tight">Tax & Inventory</h2>
        <p className="text-sm text-muted-foreground">Configure global rates and alerts.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between p-5 border-b border-border/40 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="taxRate" className="text-sm font-medium">Default Tax Rate (%)</label>
            <p className="text-xs text-muted-foreground">Applied to new transactions by default. Can be overridden per transaction.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Input {...field("taxRate")} type="number" step="0.01" min="0" max="100" defaultValue={Number(shop.taxRate)} className="font-price" />
            {state.errors?.taxRate && <p id="taxRate-error" className="text-xs text-destructive mt-1.5">{state.errors.taxRate[0]}</p>}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between p-5 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="lowStockThreshold" className="text-sm font-medium">Low Stock Threshold</label>
            <p className="text-xs text-muted-foreground">Products below this level show a low stock warning in the dashboard.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Input {...field("lowStockThreshold")} type="number" min="0" defaultValue={shop.lowStockThreshold} className="font-price" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-1 pt-4">
        <h2 className="text-xl font-semibold tracking-tight">Receipt Configuration</h2>
        <p className="text-sm text-muted-foreground">Customize the printed receipt appearance.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between p-5 border-b border-border/40 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="receiptHeader" className="text-sm font-medium">Receipt Header</label>
            <p className="text-xs text-muted-foreground">Appears at the top of the printed receipt.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Textarea {...field("receiptHeader")} defaultValue={shop.receiptHeader ?? ""} rows={2} placeholder="e.g. Thank you for shopping at Hadzka Shop!" className="resize-none" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between p-5 gap-4">
          <div className="space-y-0.5 md:w-1/3">
            <label htmlFor="receiptFooter" className="text-sm font-medium">Receipt Footer</label>
            <p className="text-xs text-muted-foreground">Appears at the bottom of the printed receipt.</p>
          </div>
          <div className="w-full md:w-2/3">
            <Textarea {...field("receiptFooter")} defaultValue={shop.receiptFooter ?? ""} rows={2} placeholder="e.g. Returns accepted within 7 days with receipt." className="resize-none" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="rounded-xl px-8 shadow-sm transition-all hover:-translate-y-[1px]"
        >
          {isPending ? "Saving Changes…" : "Save Settings"}
        </Button>
      </motion.div>
    </motion.form>
  );
}
