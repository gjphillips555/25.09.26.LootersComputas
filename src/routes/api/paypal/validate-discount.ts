import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/auth/verify.server";
import { CREDIT_PACKAGES, getSiftahDiscountPercent } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/validate-discount")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireUserId(); }
        catch { return json({ error: "Please sign in before buying Credits." }, 401); }
        const body = await request.json().catch(() => ({})) as { code?: string; packageId?: string };
        const pack = body.packageId ? CREDIT_PACKAGES[body.packageId as keyof typeof CREDIT_PACKAGES] : undefined;
        if (!pack) return json({ error: "Choose a Credits package first." }, 400);
        const code = String(body.code || "").trim().toUpperCase();
        if (!code) return json({ error: "Enter a discount code." }, 400);
        const discountPercent = getSiftahDiscountPercent(code);
        if (!discountPercent) return json({ valid: false, error: "That discount code is not valid." }, 400);
        const originalAmount = Number(pack.amount);
        const amount = (Math.round(originalAmount * (1 - discountPercent / 100) * 100) / 100).toFixed(2);
        return json({ valid: true, code, discountPercent, originalAmount: pack.amount, amount, credits: pack.credits });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
