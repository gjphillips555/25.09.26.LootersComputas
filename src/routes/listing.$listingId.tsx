import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Check, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { AfterpayLine } from "@/components/afterpay-mark";
import { AppShell } from "@/components/app-shell";
import { KeyButton, KeyLink } from "@/components/key-button";
import { PayPalMark } from "@/components/pay-with-paypal";
import { PayWithTradeMe } from "@/components/pay-with-trademe";
import { ProductCard } from "@/components/product-card";
import { QuantityStepper } from "@/components/quantity-stepper";
import { getCatalog, getProduct } from "@/lib/catalog";
import { cartProductFrom, isInCart, useCart } from "@/lib/cart-store";
import { cartCheckoutSearch } from "@/lib/orders";
import { nzd, type Product } from "@/lib/products";
import { similarAvailable } from "@/lib/product-search";

export const Route = createFileRoute("/listing/$listingId")({
  loader: async ({ params }) => {
    const product = await getProduct({ data: { id: params.listingId } });
    if (!product) throw notFound();
    let suggestions: Product[] = [];
    if (product.soldOut) {
      const catalog = await getCatalog();
      suggestions = similarAvailable(product, catalog.products);
    }
    return { product, suggestions };
  },
  component: ProductPage,
  notFoundComponent: ProductNotFound,
});

function ProductNotFound() {
  return (
    <AppShell>
      <div className="py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That item may have sold or been taken down.
        </p>
        <KeyLink to="/shop" className="mt-6">Back to shop</KeyLink>
      </div>
    </AppShell>
  );
}

function ProductPage() {
  const { product, suggestions } = Route.useLoaderData();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const setShipping = useCart((s) => s.setShipping);
  const lines = useCart((s) => s.lines);
  const line = lines.find((l) => l.id === product.id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setLocalQty] = useState(1);
  const canBuy = !product.soldOut && product.buyNow && product.amount > 0;
  const soldOut = Boolean(product.soldOut);
  const inCart = isInCart(product.id, lines);
  const photos = product.photos.length > 0 ? product.photos : product.photo ? [product.photo] : [];
  const activePhoto = photos[photoIndex] ?? photos[0];
  const soleShip = product.shipping.length === 1 ? product.shipping[0].id : "";
  const [shippingId, setShippingId] = useState(line?.shippingId || soleShip);
  const needsShipping = product.shipping.some((s) => s.price > 0);
  const emailedOnly =
    product.shipping.length > 0 && product.shipping.every((s) => s.price === 0);
  const buyQty = inCart && line ? line.qty : qty;

  function pickShipping(id: string) {
    setShippingId(id);
    if (inCart) setShipping(product.id, id);
  }

  function requireShipping() {
    if (needsShipping && !shippingId) {
      toast.error("Select a shipping option first");
      return false;
    }
    return true;
  }

  function handleAdd() {
    if (!requireShipping()) return;
    if (!inCart) {
      add(cartProductFrom(product), shippingId);
      if (qty > 1) setQty(product.id, Math.min(product.maxQty, qty));
    }
    setAdded(true);
    toast.success("Added to cart", { description: product.title });
    window.setTimeout(() => setAdded(false), 1200);
  }

  function handlePayPal() {
    if (!requireShipping()) return;
    void navigate({
      to: "/checkout",
      search: { buy: product.id, ship: shippingId, qty: buyQty },
    });
  }

  return (
    <AppShell>
      <p className="mb-6 text-sm text-muted-foreground">
        <Link to="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.categoryName ?? "Item"}</span>
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-square bg-white">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={product.title}
                  width={900}
                  height={900}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  No photo
                </div>
              )}
              {soldOut && (
                <div className="absolute inset-0 grid place-items-center bg-white/70">
                  <span className="rounded bg-neutral-900 px-4 py-2 text-sm font-bold uppercase tracking-widest text-white">
                    Sold out
                  </span>
                </div>
              )}
            </div>
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-md border ${
                    i === photoIndex ? "border-primary" : "border-border"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {product.categoryName && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.categoryName}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {product.title}
          </h1>

          <div>
            <p className="font-display text-3xl font-bold text-foreground">
              {product.priceLabel}
            </p>
            {product.amount > 0 ? (
              <div className="mt-2">
                <AfterpayLine amount={product.amount} className="text-sm" />
              </div>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
              {soldOut
                ? "Sold out. This one has already gone."
                : canBuy
                  ? "GST inclusive"
                  : "Price on request"}
            </p>
          </div>

          {emailedOnly && !soldOut && (
            <p className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
              Emailed after you pay. No courier.
            </p>
          )}

          {needsShipping && !soldOut && (
            <fieldset className="rounded-xl border border-border bg-secondary/30 p-4">
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Truck className="size-3.5" /> Choose shipping
              </legend>
              <ul className="space-y-1.5">
                {product.shipping.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/60">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`ship-${product.id}`}
                          value={s.id}
                          checked={shippingId === s.id}
                          onChange={() => pickShipping(s.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="text-muted-foreground">{s.label}</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {s.price > 0 ? nzd(s.price) : "Free"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Up to 3 items share the dearest option. Extra packs of 3 add
                the next dearest.
              </p>
            </fieldset>
          )}

          {product.attributes.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4">
              {product.attributes.map((a) => (
                <div key={a.name}>
                  <dt className="text-xs text-muted-foreground">{a.name}</dt>
                  <dd className="text-sm font-medium">{a.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex w-full flex-col gap-3">
            {soldOut ? (
              <>
                <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold">
                  Sold out — this similar unit is no longer available.
                </p>
                <KeyLink to="/shop" tone="teal" className="kb-spacebar w-full">
                  Browse live stock
                </KeyLink>
              </>
            ) : canBuy ? (
              <>
                {product.maxQty > 1 && (
                  <QuantityStepper
                    value={buyQty}
                    max={product.maxQty}
                    onChange={(q) => {
                      if (inCart) setQty(product.id, q);
                      else setLocalQty(q);
                    }}
                  />
                )}
                {/* Teal spacebar key — same width as PayPal / Trade Me */}
                <KeyButton
                  tone="teal"
                  className="kb-spacebar w-full"
                  onClick={handleAdd}
                  disabled={inCart && product.maxQty <= 1}
                >
                  {added || (inCart && product.maxQty <= 1) ? (
                    <Check className="size-4" />
                  ) : (
                    <ShoppingCart className="size-4" />
                  )}
                  {inCart && product.maxQty <= 1
                    ? "In cart"
                    : added
                      ? "Added"
                      : inCart
                        ? "Add another"
                        : "Add to cart"}
                </KeyButton>
                {inCart && (
                  <KeyLink
                    to="/checkout"
                    search={cartCheckoutSearch}
                    className="kb-spacebar w-full"
                    size="default"
                    tone="orange"
                  >
                    Checkout cart
                  </KeyLink>
                )}
                <KeyButton
                  type="button"
                  tone="paypal"
                  className="kb-spacebar w-full"
                  onClick={handlePayPal}
                >
                  <PayPalMark className="size-6" />
                  Pay with PayPal
                  {shippingId
                    ? ` · ${nzd(product.amount * buyQty + (product.shipping.find((s) => s.id === shippingId)?.price ?? 0))}`
                    : ""}
                </KeyButton>
                <p className="text-xs text-muted-foreground">
                  Pays for this item only. Guest checkout — no Google account
                  required.{" "}
                  {emailedOnly
                    ? "We email the key after payment. No courier."
                    : "Select shipping first so the total is correct."}
                </p>
              </>
            ) : (
              <KeyLink to="/shop">Back to shop</KeyLink>
            )}
            {soldOut || !product.listingUrl ? null : (
              <PayWithTradeMe href={product.listingUrl} />
            )}
          </div>
        </div>
      </div>

      {soldOut && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Still in stock, same sort of thing
          </h2>
          {suggestions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {suggestions.map((item) => (
                <ProductCard key={item.id} product={item} imageFit="contain" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing else like this is available right now.
            </p>
          )}
        </section>
      )}

      {product.description && (
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="mb-3 font-display text-lg font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </section>
      )}
    </AppShell>
  );
}
