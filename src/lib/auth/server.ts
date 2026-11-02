/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Better Auth is the only application authentication system.
 *
 * Production Google sign-in uses Better Auth socialProviders.google and the
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables. The legacy
 * Grok broker is restricted to non-production live previews only; it is never
 * used as a production authentication fallback.
 */
import { betterAuth } from "better-auth";
import { bearer, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { GROK_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import {
  GROK_ISSUER_DEFAULT,
  PREVIEW_ALLOWED_HOSTS,
  PREVIEW_CLIENT_ID,
  PREVIEW_CLIENT_SECRET,
} from "./preview";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";
const isProduction = env("VERCEL_ENV") === "production";
const configuredAuthSecret = env("BETTER_AUTH_SECRET");

if (isProduction && !configuredAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET must be configured in Vercel Production.");
}

const grokIssuer = env("GROK_AUTH_ISSUER") ?? GROK_ISSUER_DEFAULT;
const grokClientId = env("GROK_AUTH_CLIENT_ID") ?? PREVIEW_CLIENT_ID;
const grokClientSecret = env("GROK_AUTH_CLIENT_SECRET") ?? PREVIEW_CLIENT_SECRET;

const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const googleConfigured = Boolean(googleClientId && googleClientSecret);

// The broker exists solely to support dynamic live-preview hosts. Production
// must have its own Google OAuth credentials; never silently fall back to it.
const previewBrokerConfigured =
  !isProduction && Boolean(grokClientId && grokClientSecret);

export const authConfigured =
  !authDisabled && (googleConfigured || previewBrokerConfigured);

const explicitBaseURL = env("BETTER_AUTH_URL");
const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const PRODUCTION_HOSTS: string[] = [
  "looters-group-ltd.vercel.app",
  "looterscomputas.online",
  "www.looterscomputas.online",
  "*.vercel.app",
];
const PRODUCTION_ORIGINS: string[] = PRODUCTION_HOSTS.map(
  (h) => `https://${h}`,
);

const baseURL = {
  allowedHosts: [
    ...previewAllowedHosts,
    ...PRODUCTION_HOSTS,
    "localhost",
    "127.0.0.1",
    "[::1]",
  ],
  protocol: "auto" as const,
  fallback: explicitBaseURL ?? "https://www.looterscomputas.online",
};

const trustedOrigins: string[] = Array.from(
  new Set([
    ...(explicitBaseURL ? [explicitBaseURL] : []),
    ...PRODUCTION_ORIGINS,
    ...previewAllowedHosts,
    ...previewAllowedHosts.flatMap((host) => [
      `https://${host}`,
      `http://${host}`,
    ]),
    ...LOCAL_DEV_ORIGINS,
  ]),
);

const databaseUrl = env("DATABASE_URL");

const issuerBase = grokIssuer.replace(/\/+$/, "");
const grokAuthorizationUrl = `${issuerBase}/api/auth/oauth2/authorize`;
const grokTokenUrl = `${issuerBase}/api/auth/oauth2/token`;
const grokUserInfoUrl = `${issuerBase}/api/auth/oauth2/userinfo`;

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

const grokOAuthPlugin =
  !isProduction && authConfigured && !googleConfigured
    ? genericOAuth({
        config: GROK_PROVIDERS.map(({ providerId, idp }) => ({
          providerId,
          clientId: grokClientId as string,
          clientSecret: grokClientSecret as string,
          authorizationUrl: grokAuthorizationUrl,
          tokenUrl: grokTokenUrl,
          userInfoUrl: grokUserInfoUrl,
          scopes: ["openid", "profile", "email"],
          authorizationUrlParams: { idp, prompt: "login" },
        })),
      })
    : null;

export const auth = betterAuth({
  baseURL,
  secret: configuredAuthSecret ?? previewAuthSecret(),
  database,
  trustedOrigins,
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [
        "google",
        ...GROK_PROVIDERS.map((p) => p.providerId),
        GATE_PROVIDER_ID,
      ],
      requireLocalEmailVerified: false,
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),
  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
            prompt: "select_account",
          },
        },
      }
    : {}),
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },
  plugins: [
    gateIdentitySessions(),
    ...(grokOAuthPlugin ? [grokOAuthPlugin] : []),
    bearer(),
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { GROK_PROVIDERS } from "./providers";
