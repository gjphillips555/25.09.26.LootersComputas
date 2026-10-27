import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { AfterpayLine } from "@/components/afterpay-mark";
import { getProduct } from "@/lib/catalog";
import { cartProductFrom, isInCart, useCart } from "@/lib/cart-store";
import { categoryBadge } from "@/lib/product-search";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  className,
  cycleImages = false,
  priority = false,
  imageFit = "contain",
}: {
  product: Product;
  className?: string;
  cycleImages?: boolean;
  priority?: boolean;
  imageFit?: "cover" | "contain";
}) {
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [shot, setShot] = useState(0);
  const soldOut = Boolean(product.soldOut);
  const canBuy = !soldOut && product.buyNow && product.amount > 0;
  const inCart = isInCart(product.id, lines);
  const singleOnly = product.maxQty <= 1;
  const alreadyMaxed = inCart && singleOnly;
  const gallery =
    product.photos.length > 0
      ? product.photos
      : product.photo
        ? [product.photo]
        : [];
  const canCycle = cycleImages && gallery.length > 1;
  const current = gallery[shot] ?? product.photo;

  function step(e: MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setShot((i) => (i + delta + gallery.length) % gallery.length);
  }

  async function handleAdd(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) {
      void navigate({
        to: "/listing/$listingId",
        params: { listingId: product.id },
      });
      return;
    }
    if (adding || alreadyMaxed) return;
    setAdding(true);
    try {
      const full = await getProduct({ data: { id: product.id } });
      add(cartProductFrom(full ?? product));
      setAdded(true);
      const emailed =
        (full ?? product).shipping.length > 0 &&
        (full ?? product).shipping.every((s) => s.price === 0);
      toast.success("Added to cart", {
        description: emailed
          ? "Emailed after you pay. No courier."
          : "Pick shipping in your cart to tally PayPal.",
      });
      window.setTimeout(() => setAdded(false), 1200);
    } catch {
      add(cartProductFrom(product));
      toast.success("Added to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link
          to="/listing/$listingId"
          params={{ listingId: product.id }}
          className="block h-full w-full"
        >
          {current ? (
            <img
              src={current}
              alt={product.title}
              width={640}
              height={640}
              sizes="(max-width: 768px) 50vw, 25vw"
              className={cn(
                "h-full w-full",
                imageFit === "contain"
                  ? "object-contain p-4"
                  : "object-cover transition-transform duration-300 group-hover:scale-105",
              )}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "low"}
              decoding="async"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
        </Link>
        {product.isNew && (
          <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            New
          </span>
        )}
        {canCycle && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => step(e, -1)}
              className="absolute left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-secondary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => step(e, 1)}
              className="absolute right-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-secondary"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {categoryBadge(product)}
        </p>
        <Link
          to="/listing/$listingId"
          params={{ listingId: product.id }}
          className="line-clamp-2 min-h-[2.5rem] text-pretty text-sm font-semibold leading-snug hover:text-primary"
        >
          {product.title}
        </Link>

        <div className="mt-auto space-y-2 pt-1">
          <p className="font-display text-xl font-bold tabular-nums text-foreground">
            {product.priceLabel}
          </p>
          {product.amount > 0 ? <AfterpayLine amount={product.amount} /> : null}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!soldOut && (alreadyMaxed || adding || !canBuy)}
            className="shop-add"
          >
            {alreadyMaxed || added ? (
              <>
                <Check className="size-4" />
                {alreadyMaxed ? "In cart" : "Added"}
              </>
            ) : (
              <>
                <ShoppingCart className="size-4" />
                {adding ? "Adding" : "Add to cart"}
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
