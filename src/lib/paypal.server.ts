import { getSql } from "@/lib/db";

export const CREDIT_PACKAGES = {
  starter: { id: "starter", label: "Starter", credits: 40, amount: "4.99" },
  standard: { id: "standard", label: "Standard", credits: 100, amount: "9.99" },
  premium: { id: "premium", label: "Premium", credits: 200, amount: "19.99" },
} as const;

export function paypalBaseUrl() {
  return (process.env.PAYPAL_ENV || "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !secret) throw new Error("PayPal is not configured on the server.");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Could not authenticate with PayPal.");
  return data.access_token;
}

export async function paypalRequest(path: string, token: string, body?: unknown, requestId?: string) {
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(data.message || data.error_description || `PayPal request failed (${response.status}).`);
  return data;
}

export async function creditCompletedOrder(orderId: string, amount: string, currency: string, captureId?: string) {
  const sql = await getSql();
  const rows = await sql.query(
    `with valid_order as (
       select order_id, user_id, credits from siftah_paypal_orders
        where order_id = $1 and status = 'PENDING' and amount_nzd = $2::numeric and currency = $3
     ), ledger as (
       insert into siftah_credit_ledger (paypal_order_id, user_id, credits)
       select order_id, user_id, credits from valid_order
       on conflict (paypal_order_id) do nothing returning user_id, credits
     ), balance as (
       insert into siftah_credit_accounts (user_id, balance, updated_at)
       select user_id, credits, now() from ledger
       on conflict (user_id) do update
         set balance = siftah_credit_accounts.balance + excluded.balance, updated_at = now()
       returning user_id, balance
     ), marked as (
       update siftah_paypal_orders set status = 'COMPLETED', capture_id = $4, completed_at = now()
        where order_id = $1 and exists (select 1 from ledger) returning order_id
     )
     select balance.balance, ledger.credits from balance join ledger using (user_id)`,
    [orderId, amount, currency, captureId || null],
  );
  return rows[0] || null;
}

export async function getCreditBalance(userId: string) {
  const sql = await getSql();
  const rows = await sql.query("select balance from siftah_credit_accounts where user_id = $1", [userId]);
  return Number(rows[0]?.balance ?? 0);
}
