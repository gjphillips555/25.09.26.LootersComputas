import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { CartLine } from "@/lib/cart-store";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  city: string;
  region: string;
  notes: string;
};

export type OrderSource = "cart" | "buynow";

export type PlacedOrder = {
  id: string;
  createdAt: string;
  customer: Customer;
  lines: CartLine[];
  subtotal: number;
  shippingTotal: number;
  total: number;
  source: OrderSource;
  paid?: boolean;
};

export const cartCheckoutSearch = {
  buy: undefined as string | undefined,
  ship: undefined as string | undefined,
  qty: 1,
};

export const emptyCustomer: Customer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  suburb: "",
  city: "",
  region: "Wellington",
  notes: "",
};

const ORDERS_KEY = "looters-orders";
const CUSTOMER_KEY = "looters-customer";

function readAll(): PlacedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlacedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: PlacedOrder) {
  const all = [order, ...readAll().filter((o) => o.id !== order.id)].slice(0, 20);
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  saveSavedCustomer(order.customer);
}

export function getOrder(id: string): PlacedOrder | null {
  return readAll().find((o) => o.id === id) ?? null;
}

export function loadSavedCustomer(): Customer {
  if (typeof window === "undefined") return emptyCustomer;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return emptyCustomer;
    const parsed = JSON.parse(raw) as Partial<Customer>;
    return { ...emptyCustomer, ...parsed };
  } catch {
    return emptyCustomer;
  }
}

export function saveSavedCustomer(customer: Customer) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
}

export function newOrderId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `LR-${Date.now().toString(36).toUpperCase()}-${n}`;
}

export function customerLooksComplete(customer: Customer) {
  return (
    customer.name.trim().length > 1 &&
    /.+@.+\..+/.test(customer.email) &&
    customer.phone.trim().length >= 7 &&
    customer.address.trim().length > 2 &&
    customer.city.trim().length > 1 &&
    customer.region.trim().length > 1
  );
}

function asCustomer(input: unknown): Customer {
  const c = (input ?? {}) as Partial<Customer>;
  return {
    name: String(c.name ?? "").slice(0, 120),
    email: String(c.email ?? "").slice(0, 160),
    phone: String(c.phone ?? "").slice(0, 40),
    address: String(c.address ?? "").slice(0, 200),
    suburb: String(c.suburb ?? "").slice(0, 80),
    city: String(c.city ?? "").slice(0, 80),
    region: String(c.region ?? "").slice(0, 80),
    notes: String(c.notes ?? "").slice(0, 500),
  };
}

function asOrder(input: unknown): PlacedOrder {
  const o = (input ?? {}) as Partial<PlacedOrder>;
  const id = String(o.id ?? "");
  if (!/^LR-[A-Z0-9-]+$/.test(id)) throw new Error("Invalid order id");
  const lines = Array.isArray(o.lines) ? o.lines : [];
  if (lines.length === 0 || lines.length > 30) throw new Error("Invalid items");
  const total = Number(o.total);
  if (!Number.isFinite(total) || total < 0 || total > 20000) {
    throw new Error("Invalid total");
  }
  return {
    id,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
    customer: asCustomer(o.customer),
    lines: lines as CartLine[],
    subtotal: Number(o.subtotal) || 0,
    shippingTotal: Number(o.shippingTotal) || 0,
    total,
    source: o.source === "buynow" ? "buynow" : "cart",
    paid: Boolean(o.paid),
  };
}

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => asOrder(input))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into shop_orders
         (id, created_at, customer, lines, subtotal, shipping_total, total, source, paid)
       values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9)
       on conflict (id) do update set
         customer = excluded.customer,
         lines = excluded.lines,
         subtotal = excluded.subtotal,
         shipping_total = excluded.shipping_total,
         total = excluded.total,
         source = excluded.source`,
      [
        data.id,
        data.createdAt,
        JSON.stringify(data.customer),
        JSON.stringify(data.lines),
        data.subtotal,
        data.shippingTotal,
        data.total,
        data.source,
        Boolean(data.paid),
      ],
    );
    return { ok: true as const };
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const id = String((input as { id?: unknown } | null)?.id ?? "");
    if (!/^LR-[A-Z0-9-]+$/.test(id)) throw new Error("Invalid order id");
    return { id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(`update shop_orders set paid = true where id = $1`, [data.id]);
    return { ok: true as const };
  });

export function orderMailto(order: PlacedOrder) {
  const { customer, lines, subtotal, shippingTotal, total } = order;
  const nzd = (n: number) =>
    new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(n);
  const itemLines = lines
    .map((l) => {
      const ship = l.shipping.find((s) => s.id === l.shippingId);
      return [
        `- ${l.title}`,
        `  Qty ${l.qty} × ${nzd(l.amount)} = ${nzd(l.qty * l.amount)}`,
        `  Shipping: ${ship?.label ?? "TBC"} (${ship && ship.price > 0 ? nzd(ship.price) : "Free"})`,
        `  Item: ${l.listingUrl}`,
      ].join("\n");
    })
    .join("\n\n");
  const body = [
    `New LootersRetail order ${order.id}`,
    ``,
    `Customer`,
    `${customer.name}`,
    `${customer.email}`,
    customer.phone,
    `${customer.address}`,
    `${customer.suburb}, ${customer.city}`,
    customer.region,
    customer.notes ? `Notes: ${customer.notes}` : "",
    ``,
    `Items`,
    itemLines,
    ``,
    `Items ${nzd(subtotal)}`,
    `Shipping ${nzd(shippingTotal)}`,
    `Total ${nzd(total)} GST incl.`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const subject = encodeURIComponent(`LootersRetail order ${order.id}`);
  return `mailto:LootersRetail@protonmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}
