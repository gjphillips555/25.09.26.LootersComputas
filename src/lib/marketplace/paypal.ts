/**
 * PayPal "Log in with PayPal" / Connect flow helpers.
 *
 * Users register with Google. To create listings or make deals they must
 * complete this one-time PayPal connection so we have confirmed ownership
 * of a real PayPal account (email + payer_id).
 *
 * Required env (set in Vercel / .env):
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_MODE = "sandbox" | "live"   (default sandbox)
 *
 * Scopes we request: openid profile email + paypalattributes (for verified status)
 */

const env = (key: string) => process.env[key]?.trim() || undefined;

export const paypalConfigured = Boolean(
  env("PAYPAL_CLIENT_ID") && env("PAYPAL_CLIENT_SECRET"),
);

export function getPayPalBase() {
  const mode = env("PAYPAL_MODE") === "live" ? "live" : "sandbox";
  return {
    mode,
    authBase:
      mode === "live"
        ? "https://www.paypal.com"
        : "https://www.sandbox.paypal.com",
    apiBase:
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
    clientId: env("PAYPAL_CLIENT_ID")!,
    clientSecret: env("PAYPAL_CLIENT_SECRET")!,
  };
}

/** Build the authorization URL the user is sent to. */
export function buildPayPalAuthUrl(opts: {
  redirectUri: string;
  state: string;
}) {
  const { authBase, clientId } = getPayPalBase();
  const scopes = [
    "openid",
    "profile",
    "email",
    "https://uri.paypal.com/services/paypalattributes",
  ].join(" ");

  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: clientId,
    response_type: "code",
    scope: scopes,
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });

  return `${authBase}/connect?${params.toString()}`;
}

/** Exchange the authorization code for tokens + user info. */
export async function exchangePayPalCode(opts: {
  code: string;
  redirectUri: string;
}) {
  const { apiBase, clientId, clientSecret } = getPayPalBase();

  // 1. Token
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`PayPal token exchange failed: ${tokenRes.status} ${text}`);
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  // 2. User info
  const infoRes = await fetch(
    `${apiBase}/v1/identity/openidconnect/userinfo?schema=openid`,
    {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    },
  );

  if (!infoRes.ok) {
    const text = await infoRes.text();
    throw new Error(`PayPal userinfo failed: ${infoRes.status} ${text}`);
  }

  const info = (await infoRes.json()) as {
    sub?: string; // payer_id style identifier
    user_id?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    verified_account?: boolean;
    account_type?: string;
  };

  const payerId = info.sub || info.user_id;
  if (!payerId || !info.email) {
    throw new Error("PayPal did not return email + payer id");
  }

  return {
    payerId,
    email: info.email,
    emailVerified: Boolean(info.email_verified),
    verifiedAccount: Boolean(info.verified_account),
    name: info.name || [info.given_name, info.family_name].filter(Boolean).join(" "),
    accessToken: tokenJson.access_token,
  };
}
