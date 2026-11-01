import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { creditCompletedOrder, paypalAccessToken, paypalRequest } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/capture-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try { userId = await requireUserId(); }
        catch { return json({ error: "Please sign in to finish your purchase." }, 401); }

        const body = await request.json().catch(() => ({})) as { orderId?: string };
        if (!body.orderId || typeof body.orderId !== "string") return json({ error: "Missing PayPal order ID." }, 400);

        try {
          const sql = await getSql();
          const pendingRows = await sql.query(
            "select order_id, amount_nzd, currency, status from siftah_paypal_orders where order_id = $1 and user_id = $2",
            [body.orderId, userId],
          );
          const pending = pendingRows[0] as { order_id: string; amount_nzd: string; currency: string; status: string } | undefined;
          if (!pending) return json({ error: "This PayPal order does not belong to your account." }, 404);

          if (pending.status !== "COMPLETED") {
            const token = await paypalAccessToken();
            const captured = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(body.orderId)}/capture`, token, {});
            const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
            if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
              return json({ error: "PayPal has not confirmed this payment yet." }, 402);
            }
            const result = await creditCompletedOrder(
              body.orderId,
              String(capture.amount?.value || ""),
              String(capture.amount?.currency_code || ""),
              capture.id,
            );
            if (!result) {
              const completedRows = await sql.query(
                "select status from siftah_paypal_orders where order_id = $1 and user_id = $2",
                [body.orderId, userId],
              );
              if (completedRows[0]?.status !== "COMPLETED") {
                return json({ error: "Payment amount did not match the selected Credits package." }, 409);
              }
            }
          }

          const accountRows = await sql.query("select balance from siftah_credit_accounts where user_id = $1", [userId]);
          return json({ success: true, creditsBalance: Number(accountRows[0]?.balance ?? 0) });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Could not confirm PayPal payment." }, 502);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
