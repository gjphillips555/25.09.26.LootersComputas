import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { CREDIT_PACKAGES, paypalAccessToken, paypalRequest } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try { userId = await requireUserId(); }
        catch { return json({ error: "Please sign in before buying Credits." }, 401); }

        const body = await request.json().catch(() => ({})) as { packageId?: string };
        const pack = body.packageId ? CREDIT_PACKAGES[body.packageId as keyof typeof CREDIT_PACKAGES] : undefined;
        if (!pack) return json({ error: "Choose a valid Credits package." }, 400);

        try {
          const token = await paypalAccessToken();
          const origin = new URL(request.url).origin;
          const order = await paypalRequest("/v2/checkout/orders", token, {
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: "siftah-credits",
              custom_id: userId,
              description: `${pack.credits} Siftah Credits`,
              amount: { currency_code: "NZD", value: pack.amount },
            }],
            application_context: {
              brand_name: "Looters Computas",
              user_action: "PAY_NOW",
              return_url: `${origin}/siftah?paypal=success`,
              cancel_url: `${origin}/siftah?paypal=cancelled`,
            },
          }, `siftah-${pack.id}-${crypto.randomUUID()}`);

          const approval = order.links?.find((link: { rel: string; href: string }) => link.rel === "approve");
          if (!order.id || !approval?.href) throw new Error("PayPal did not return an approval link.");
          const sql = await getSql();
          await sql.query(
            `insert into siftah_paypal_orders (order_id, user_id, package_id, credits, amount_nzd, currency)
             values ($1, $2, $3, $4, $5, 'NZD') on conflict (order_id) do nothing`,
            [order.id, userId, pack.id, pack.credits, pack.amount],
          );
          return json({ approvalUrl: approval.href, orderId: order.id });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Could not start PayPal checkout." }, 502);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
