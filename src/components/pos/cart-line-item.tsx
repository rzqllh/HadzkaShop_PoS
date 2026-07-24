import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { Plus, Minus } from "@phosphor-icons/react";

interface BaseProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

interface CartItem<T extends BaseProduct> {
  product: T;
  qty: number;
}

interface CartLineItemProps<T extends BaseProduct> {
  item: CartItem<T>;
  onUpdateQty: (productId: string, newQty: number) => void;
}

export function CartLineItem<T extends BaseProduct>({ item, onUpdateQty }: CartLineItemProps<T>) {
  return (
    <div className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/30">
      {item.product.imageUrl ? (
        <img
          src={item.product.imageUrl}
          alt={item.product.name}
          className="w-16 h-16 rounded-md object-cover flex-shrink-0 border border-border bg-muted"
        />
      ) : (
        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border border-border">
          <span className="text-xs text-muted-foreground font-semibold">IMG</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
          {item.product.name}
        </h4>
        <p className="text-sm text-primary font-price mt-1">
          {formatIDR(item.product.price)}
        </p>
      </div>
      {/* Qty stepper */}
      <div className="flex items-center flex-shrink-0 bg-muted/50 rounded-lg p-0.5 border border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdateQty(item.product.id, item.qty - 1)}
          className="h-8 w-8 text-base rounded-md hover:bg-background shadow-sm"
          aria-label="Kurangi jumlah"
        >
          <Minus size={16} weight="bold" />
        </Button>
        <span className="w-6 text-center text-base font-price font-bold text-foreground">
          {item.qty}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
          disabled={item.qty >= item.product.stock}
          className="h-8 w-8 text-base rounded-md hover:bg-background shadow-sm disabled:opacity-30"
          aria-label="Tambah jumlah"
        >
          <Plus size={16} weight="bold" />
        </Button>
      </div>
      <div className="min-w-[90px] text-right flex-shrink-0">
        <span className="text-base font-price font-bold text-foreground">
          {formatIDR(item.product.price * item.qty)}
        </span>
      </div>
    </div>
  );
}
