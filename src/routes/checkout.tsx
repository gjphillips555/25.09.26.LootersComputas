import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { GoogleSignIn } from "@/components/google-sign-in";
import { KeyButton, KeyLink } from "@/components/key-button";
import { PayWithCard } from "@/components/pay-with-card";
import { PayWithPaypal } from "@/components/pay-with-paypal";
import { airwallexReady } from "@/lib/airwallex";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cartProductFrom, useCart, useCartTotals, type CartLine } from "@/lib/cart-store";
import { getProduct } from "@/lib/catalog";
import {
  customerLooksComplete,
  emptyCustomer,
  loadSavedCustomer,
  newOrderId,
  placeOrder,
  saveOrder,
  type Customer,
  type OrderSource,
} from "@/lib/orders";
import { NZ_REGIONS, nzd } from "@/lib/products";
import { packingLabel, packingQuote } from "@/lib/shipping";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => {
    const buy = typeof search.buy === "string" && /^\d+$/.test(search.buy) ? search.buy : undefined;
    const ship = typeof search.ship === "string" ? search.ship : undefined;
    const qtyRaw = Number(search.qty);
    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(99, Math.round(qtyRaw))) : 1;
    return { buy, ship, qty };
  },
  loaderDeps: ({ search }) => ({ buy: search.buy, ship: search.ship, qty: search.qty }),
  loader: async ({ deps }) => {
    if (!deps.buy) return { buyNow: null as Awaited<ReturnType<typeof getProduct>> };
    const product = await getProduct({ data: { id: deps.buy } });
    return { buyNow: product };
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const { buy, ship, qty } = Route.useSearch();
  const { buyNow } = Route.useLoaderData();
  const cart = useCartTotals();
  const setShipping = useCart((s) => s.setShipping);
  const { user } = useCurrentUserState();
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [cardsOn, setCardsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId] = useState(() => newOrderId());
  const [buyShip, setBuyShip] = useState(ship ?? "");

  useEffect(() => {
    void airwallexReady()
      .then(setCardsOn)
      .catch(() => setCardsOn(false));
  }, []);

  useEffect(() => {
    setCustomer((prev) => {
      const saved = loadSavedCustomer();
      return {
        ...saved,
        name: prev.name || saved.name,
        email: prev.email || saved.email,
      };
    });
  }, []);

  const isBuyNow = Boolean(buy);
  const source: OrderSource = isBuyNow ? "buynow" : "cart";

  const buyLine: CartLine | null = useMemo(() => {
    if (!buyNow) return null;
    const cap = Math.max(1, buyNow.maxQty);
    const chosen =
      buyShip && buyNow.shipping.some((s) => s.id === buyShip)
        ? buyShip
        : buyNow.shipping.length === 1
          ? buyNow.shipping[0].id
          : "";
    return {
      ...cartProductFrom(buyNow),
      qty: Math.min(cap, qty),
      shippingId: chosen,
    };
  }, [buyNow, buyShip, qty]);

  const lines = isBuyNow ? (buyLine ? [buyLine] : []) : cart.lines;
  const packing = packingQuote(lines);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.amount, 0);
  const shippingTotal = packing.ready ? packing.shippingTotal : 0;
  const itemCount = packing.itemCount;
  const shippingReady = packing.ready && lines.length > 0;
  const total = subtotal + shippingTotal;
  const gstPortion = total - total / 1.15;
  const itemName =
    isBuyNow && buyLine
      ? buyLine.title.slice(0, 120)
      : `LootersRetail order ${orderId}`;

  useEffect(() => {
    if (!user) return;
    setCustomer((prev) => ({
      ...prev,
      name: prev.name || user.displayName || "",
      email: prev.email || user.primaryEmail || "",
    }));
  }, [user]);

  function update<K extends keyof Customer>(key: K, value: Customer[K]) {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  }

  const detailsOk = customerLooksComplete(customer);
  const canPay = lines.length > 0 && detailsOk && shippingReady;

  async function persistOrder() {
    if (!canPay) {
      setError(
        shippingReady
          ? "Please complete your contact and delivery details."
          : "Select a shipping option to tally the total.",
      );
      return false;
    }
    const order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer,
      lines,
      subtotal,
      shippingTotal,
      total,
      source,
    };
    saveOrder(order);
    try {
      await placeOrder({ data: order });
    } catch (err) {
      console.error("[looters] placeOrder", err);
    }
    return true;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void persistOrder();
  }

  if (isBuyNow && !buyNow) {
    return (
      <AppShell>
        <div className="py-24 text-center">
          <h1 className="font-display text-2xl font-semibold">Item unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            That product may have sold. Add something else from the shop.
          </p>
          <KeyLink to="/shop" className="mt-6">Browse shop</KeyLink>
        </div>
      </AppShell>
    );
  }

  if (lines.length === 0) {
    return (
      <AppShell>
        <div className="py-24 text-center">
          <h1 className="font-display text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a product before checking out.
          </p>
          <KeyLink to="/shop" className="mt-6">Browse shop</KeyLink>
        </div>
      </AppShell>
    );
  }

  const cancelPath = isBuyNow && buy
    ? `/checkout?buy=${buy}&ship=${encodeURIComponent(buyShip)}&qty=${qty}`
    : "/checkout";

  return (
    <AppShell>
      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight">
        {isBuyNow ? "Buy now" : "Checkout"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {user
          ? `Signed in as ${user.displayName ?? user.primaryEmail}. Paying as a guest is also fine.`
          : "No account needed — continue as guest. Google is optional if you want your name and email filled in."}
      </p>
      {!user && authEnabled && (
        <div className="mb-6 max-w-sm">
          <GoogleSignIn
            callbackURL="/checkout"
            label="Optional: Sign In With Google"
            size="sm"
            tone="teal"
          />
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
      >
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Delivery details</h2>
          <Field label="Full name" htmlFor="name">
            <Input
              id="name"
              autoComplete="name"
              required
              value={customer.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={customer.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={customer.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Street address" htmlFor="address">
            <Input
              id="address"
              autoComplete="street-address"
              required
              value={customer.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Suburb" htmlFor="suburb">
              <Input
                id="suburb"
                autoComplete="address-level3"
                value={customer.suburb}
                onChange={(e) => update("suburb", e.target.value)}
              />
            </Field>
            <Field label="City" htmlFor="city">
              <Input
                id="city"
                autoComplete="address-level2"
                required
                value={customer.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </Field>
            <Field label="Region" htmlFor="region">
              <select
                id="region"
                value={customer.region}
                onChange={(e) => update("region", e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {NZ_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Order notes (optional)" htmlFor="notes">
            <textarea
              id="notes"
              rows={3}
              value={customer.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Pickup window, courier instructions…"
            />
          </Field>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We store name, email, phone and delivery address with the order so
            we can pack and ship. Card details stay with Airwallex or PayPal — we never see
            them.
          </p>
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">
            Order summary
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({itemCount})
            </span>
          </h2>
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    {line.photo ? (
                      <img src={line.photo} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{line.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {line.qty} · {nzd(line.amount * line.qty)}
                    </p>
                  </div>
                </div>
                {line.shipping.length > 0 && (
                  <select
                    aria-label={`Shipping for ${line.title}`}
                    value={isBuyNow ? buyShip : line.shippingId}
                    onChange={(e) => {
                      if (isBuyNow) setBuyShip(e.target.value);
                      else setShipping(line.id, e.target.value);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="">Select shipping</option>
                    {line.shipping.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {s.price > 0 ? nzd(s.price) : "Free"}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Items</dt>
              <dd className="tabular-nums">{nzd(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Shipping</dt>
              <dd className="tabular-nums">
                {shippingReady
                  ? shippingTotal > 0
                    ? nzd(shippingTotal)
                    : "Free"
                  : "Select options"}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>GST (15% incl.)</dt>
              <dd className="tabular-nums">{nzd(gstPortion)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums text-accent">
                {shippingReady ? nzd(total) : nzd(subtotal)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {packingLabel(itemCount, packing.packages, shippingReady)}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {cardsOn ? (
            <PayWithCard
              orderId={orderId}
              amount={shippingReady ? total : 0}
              title={itemName}
              disabled={!canPay}
              onBeforePay={persistOrder}
              onError={setError}
            />
          ) : null}
          <PayWithPaypal
            orderId={orderId}
            amount={shippingReady ? total : 0}
            disabled={!canPay}
            customer={customer}
            itemName={itemName}
            cancelPath={cancelPath}
            onBeforePay={persistOrder}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {cardsOn
              ? "Card, Apple Pay and Google Pay go through Airwallex. PayPal is still there if that is easier."
              : "PayPal is on now. Card, Apple Pay and Google Pay appear here once the Airwallex account is connected."}
          </p>
        </aside>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
