import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { runPreSignInSignOut, runSignOut } from "../../../scripts/sign-out-plan.mjs";
import { GROK_PROVIDERS } from "./providers";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export { GROK_PROVIDERS };

const BEARER_KEY = "grok-auth.bearer-token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* ignore */
  }
}

function inLivePreview(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".grok-sandbox.com");
}

function onLootersSite(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "looterscomputas.online" ||
    host === "www.looterscomputas.online" ||
    host.endsWith(".vercel.app")
  );
}

type PopupMessage = { source: "grok-auth-popup"; token: string | null; error?: string };

/** Map legacy broker id → native Google on our domains. */
function resolveProviderId(providerId: string): string {
  if (providerId === "grok-google" || providerId === "google") {
    if (onLootersSite() || !inLivePreview()) return "google";
  }
  return providerId;
}

/**
 * Native Google only. When GOOGLE_CLIENT_* is set the server does NOT mount
 * /api/auth/sign-in/oauth2 — that path 404s. Always use /sign-in/social.
 */
async function fetchGoogleAuthorizeUrl(
  callbackURL: string,
  errorCallbackURL: string,
): Promise<string> {
  const res = await fetch("/api/auth/sign-in/social", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    }),
  });

  const text = await res.text();
  let body: { url?: string; redirect?: boolean; message?: string; error?: string } | null =
    null;
  try {
    body = text ? (JSON.parse(text) as typeof body) : null;
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const detail =
      body?.message || body?.error || text.slice(0, 180) || `HTTP ${res.status}`;
    throw new Error(`Google sign-in failed: ${detail}`);
  }

  if (body?.url) return body.url;

  throw new Error(
    "Google sign-in did not return a redirect URL. Check GOOGLE_CLIENT_ID/SECRET and the Google Cloud redirect URI.",
  );
}

export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const callbackURL = opts.callbackURL ?? "/";
  const errorCallbackURL = opts.errorCallbackURL ?? "/";
  providerId = resolveProviderId(providerId);

  const popup = inLivePreview() ? openSignInPopup(providerId) : null;

  try {
    await runPreSignInSignOut({
      livePreview: inLivePreview(),
      hasBearer: Boolean(getBearerToken()),
      requestSignOut: () => authClient.signOut(),
      clearToken: () => setBearerToken(null),
    });
  } catch {
    setBearerToken(null);
  }

  if (inLivePreview()) {
    if (!popup) throw new Error("Pop-up blocked — allow pop-ups for sign-in");
    const token = await waitForPopupToken(popup);
    if (!token) throw new Error("Sign-in was cancelled or failed");
    setBearerToken(token);
    try {
      await authClient.getSession();
    } catch {
      /* recover on next getSession */
    }
    if (typeof window !== "undefined") {
      const dest = new URL(callbackURL, window.location.origin);
      const here = window.location;
      if (
        dest.origin !== here.origin ||
        dest.pathname !== here.pathname ||
        dest.search !== here.search
      ) {
        window.location.href = callbackURL;
      }
    }
    return;
  }

  // Google: ONLY /api/auth/sign-in/social (never /oauth2 — that 404s when Google is configured).
  if (providerId === "google") {
    const url = await fetchGoogleAuthorizeUrl(callbackURL, errorCallbackURL);
    window.location.assign(url);
    return;
  }

  // Non-Google brokers only exist on preview sandbox.
  if (onLootersSite()) {
    throw new Error("Only Google sign-in is available on this site.");
  }

  const { data, error } = await authClient.signIn.oauth2({
    providerId,
    callbackURL,
    errorCallbackURL,
  });
  if (error) throw new Error(error.message ?? "Sign-in failed");
  if (data?.url) window.location.assign(data.url);
}

function openSignInPopup(providerId: string): Window | null {
  const origin = window.location.origin;
  const url = `${origin}/auth/popup?providerId=${encodeURIComponent(providerId)}`;
  const name = `grok-signin-${Date.now()}`;
  return window.open(url, name, "popup,width=500,height=650");
}

function waitForPopupToken(popup: Window): Promise<string | null> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    let settled = false;
    let closeTimer: number | undefined;
    const settle = (token: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as PopupMessage | undefined;
      if (!data || data.source !== "grok-auth-popup") return;
      settle(data.token ?? null);
    };
    const pollTimer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(pollTimer);
      closeTimer = window.setTimeout(() => settle(null), 400);
    }, 300);
    function cleanup() {
      window.clearInterval(pollTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      window.removeEventListener("message", onMessage);
    }
    window.addEventListener("message", onMessage);
  });
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    livePreview: inLivePreview(),
    hasBearer: Boolean(getBearerToken()),
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    clearToken: () => setBearerToken(null),
    redirect: () => {
      window.location.href = redirectTo;
    },
  });
}
