/**
 * Profile helpers — especially the PayPal-connected gate.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  paypal_email: string | null;
  paypal_payer_id: string | null;
  paypal_verified: boolean;
  paypal_connected_at: string | null;
  skrill_email: string | null;
  location: string | null;
  bio: string | null;
};

/** Returns true when the user has completed the official PayPal connect flow. */
export function isPayPalConnected(profile: ProfileRow | null | undefined) {
  return Boolean(profile?.paypal_payer_id && profile?.paypal_email);
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    // neon/postgres: generic is the *row* type; result is always an array of rows
    const rows = await sql<ProfileRow>`
      select * from profiles where user_id = ${context.userId} limit 1
    `;
    return rows[0] ?? null;
  });

/** Ensure a profile row exists (called after first Google sign-in). */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id)
      values (${context.userId})
      on conflict (user_id) do nothing
    `;
    return { ok: true };
  });

/** Persist a successful PayPal connection. */
export const savePayPalConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    email: string;
    payerId: string;
    verifiedAccount: boolean;
  }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, paypal_email, paypal_payer_id, paypal_verified, paypal_connected_at, updated_at)
      values (
        ${context.userId},
        ${data.email},
        ${data.payerId},
        ${data.verifiedAccount},
        now(),
        now()
      )
      on conflict (user_id) do update set
        paypal_email = excluded.paypal_email,
        paypal_payer_id = excluded.paypal_payer_id,
        paypal_verified = excluded.paypal_verified,
        paypal_connected_at = excluded.paypal_connected_at,
        updated_at = now()
    `;
    return { ok: true };
  });

/** Throw if the current user has not connected PayPal. Use inside any deal/listing server fn. */
export async function requirePayPalConnected(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ paypal_payer_id: string | null; paypal_email: string | null }>`
    select paypal_payer_id, paypal_email from profiles where user_id = ${userId} limit 1
  `;

  const p = rows[0];
  if (!p?.paypal_payer_id || !p?.paypal_email) {
    throw new Error("PAYPAL_REQUIRED");
  }
  return p;
}
