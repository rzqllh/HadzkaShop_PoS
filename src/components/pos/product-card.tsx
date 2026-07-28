import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";

interface BaseProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  lowStockThreshold?: number | null;
}

interface ProductCardProps<T extends BaseProduct> {
  product: T;
  inCartQty?: number;
  onAddToCart: (product: T) => void;
}

export function ProductCard<T extends BaseProduct>({ product, inCartQty = 0, onAddToCart }: ProductCardProps<T>) {
  const isLow = product.lowStockThreshold != null && product.stock <= product.lowStockThreshold;
  const outOfStock = product.stock === 0;

  return (
    <Card
      onClick={() => !outOfStock && onAddToCart(product)}
      className={`
        relative flex flex-col text-left overflow-visible transition-all duration-300
        min-h-[220px] group cursor-pointer border bg-card rounded-2xl
        ${outOfStock
          ? "opacity-60 cursor-not-allowed grayscale"
          : inCartQty > 0
          ? "border-primary/50 shadow-md ring-1 ring-primary/20 scale-[0.98]"
          : "hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
        }
      `}
      aria-label={`Add ${product.name} to cart`}
    >
      {/* Product Image Wrapper */}
      <div className="w-full p-2 pb-0">
        <div className="w-full aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden rounded-[14px] relative">
          {product.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <span className="text-muted-foreground/40 font-semibold text-xs tracking-wider">NO IMAGE</span>
          )}
          
          {/* Always show stock badge */}
          {!outOfStock && (
            <Badge 
              variant={isLow ? "destructive" : "secondary"} 
              className="absolute top-2 left-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider shadow-sm opacity-90 backdrop-blur-md"
            >
              Stok: {product.stock}
            </Badge>
          )}

          {outOfStock && (
            <Badge variant="destructive" className="absolute top-2 left-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider shadow-sm opacity-90">
              Habis
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 pt-3 flex flex-col flex-1">
        <span className="font-semibold text-sm leading-snug line-clamp-2 mb-1 text-foreground">
          {product.name}
        </span>
        <span className="mt-auto font-price text-lg font-bold text-primary tracking-tight">
          {formatIDR(product.price)}
        </span>
      </CardContent>

      {/* Cart Quantity Badge - Apple style notification dot */}
      {inCartQty > 0 && (
        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-background transform transition-transform animate-in zoom-in-75">
          {inCartQty}
        </div>
      )}
    </Card>
  );
}
