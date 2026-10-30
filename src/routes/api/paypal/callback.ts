/**
 * PayPal OAuth callback.
 * Route: GET /api/paypal/callback?code=...&state=...
 *
 * After success we redirect the user back to /account?paypal=connected
 */
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  exchangePayPalCode,
  paypalConfigured,
} from "@/lib/marketplace/paypal";
import { savePayPalConnection } from "@/lib/marketplace/profile";

const handleCallback = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { code?: string; state?: string; error?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!paypalConfigured) {
      return { redirect: "/account?paypal=error&reason=not_configured" };
    }
    if (data.error) {
      return { redirect: `/account?paypal=error&reason=${encodeURIComponent(data.error)}` };
    }
    if (!data.code) {
      return { redirect: "/account?paypal=error&reason=missing_code" };
    }

    // The redirect_uri must match exactly what we used when starting the flow
    const origin =
      process.env.BETTER_AUTH_URL?.replace(/\/+$/, "") ||
      "https://www.looterscomputas.online";
    const redirectUri = `${origin}/api/paypal/callback`;

    try {
      const info = await exchangePayPalCode({
        code: data.code,
        redirectUri,
      });

      await savePayPalConnection({
        data: {
          email: info.email,
          payerId: info.payerId,
          verifiedAccount: info.verifiedAccount,
        },
      });

      return { redirect: "/account?paypal=connected" };
    } catch (err) {
      console.error("[paypal callback]", err);
      return { redirect: "/account?paypal=error&reason=exchange_failed" };
    }
  });

export const Route = createFileRoute("/api/paypal/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const result = await handleCallback({
          data: {
            code: url.searchParams.get("code") ?? undefined,
            state: url.searchParams.get("state") ?? undefined,
            error: url.searchParams.get("error") ?? undefined,
          },
        });

        return Response.redirect(
          new URL(result.redirect, url.origin).toString(),
          302,
        );
      },
    },
  },
});
