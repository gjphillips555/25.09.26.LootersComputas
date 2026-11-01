import { createFileRoute } from "@tanstack/react-router";
import { paypalAccessToken, paypalBaseUrl, creditCompletedOrder } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
        if (!webhookId) return json({ error: "Webhook is not configured." }, 503);
        const event = await request.json().catch(() => null) as Record<string, any> | null;
        if (!event) return json({ error: "Invalid webhook JSON." }, 400);
        try {
          const token = await paypalAccessToken();
          const verifyResponse = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_algo: request.headers.get("paypal-auth-algo"),
              cert_url: request.headers.get("paypal-cert-url"),
              transmission_id: request.headers.get("paypal-transmission-id"),
              transmission_sig: request.headers.get("paypal-transmission-sig"),
              transmission_time: request.headers.get("paypal-transmission-time"),
              webhook_id: webhookId,
              webhook_event: event,
            }),
          });
          const verification = await verifyResponse.json() as { verification_status?: string };
          if (!verifyResponse.ok || verification.verification_status !== "SUCCESS") {
            return json({ error: "PayPal signature verification failed." }, 400);
          }
          if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
            const resource = event.resource || {};
            const orderId = resource.supplementary_data?.related_ids?.order_id;
            const amount = resource.amount?.value;
            const currency = resource.amount?.currency_code;
            if (orderId && amount && currency === "NZD") {
              await creditCompletedOrder(String(orderId), String(amount), currency, resource.id);
            }
          }
          return json({ received: true });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
