import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { buildPayPalAuthUrl, paypalConfigured } from "./paypal";
import { randomBytes } from "node:crypto";

/**
 * Returns the URL the browser should navigate to in order to start
 * the official Log in with PayPal flow.
 */
export const startPayPalConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    if (!paypalConfigured) {
      throw new Error(
        "PayPal is not configured yet. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      );
    }

    const origin =
      process.env.BETTER_AUTH_URL?.replace(/\/+$/, "") ||
      "https://www.looterscomputas.online";
    const redirectUri = `${origin}/api/paypal/callback`;
    const state = randomBytes(16).toString("hex");

    // In a fuller implementation we would store `state` in the session / DB
    // to protect against CSRF. For the first version we keep it simple.

    const url = buildPayPalAuthUrl({ redirectUri, state });
    return { url };
  });
