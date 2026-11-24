import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { PageScrollKeys } from "@/components/page-scroll-keys";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { SiteFooter } from "@/components/site-footer";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SiftahMark } from "@/components/siftah/brand";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * Page body for routed pages. The Siftah app bar, mobile tab bar and chat head
 * are rendered once for every route by <SiftahFrame> in __root.tsx.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isPending } = useCurrentUserState();
  const path = location.pathname;
  const publicBrowse =
    path === "/" ||
    path === "/shop" ||
    path.startsWith("/shop/") ||
    // Siftah Auto: guests can browse and open listings; listing a vehicle or sharing a link needs sign-in.
    ((path === "/auto" || path.startsWith("/auto/")) && !path.startsWith("/auto/sell") && !path.startsWith("/auto/share"));
  const signInRequired = authEnabled && !publicBrowse && (isPending || !user);
  const callbackURL = path + (location.searchStr || "");

  return (
    <div className="flex min-h-[calc(100dvh-4.25rem)] flex-col overflow-x-clip">
      <main className="shell-main mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {signInRequired ? (
          isPending ? (
            <div className="py-24 text-center text-sm text-muted-foreground">Checking your Siftah account…</div>
          ) : (
            <section className="mx-auto my-12 max-w-md overflow-hidden rounded-3xl border-2 border-[#0b0b0c] bg-card text-center shadow-[6px_6px_0_#e3121b]">
              <div className="bg-[#0b0b0c] px-6 py-6 text-white">
                <SiftahMark className="mx-auto size-14" />
                <h1 className="mt-3 font-display text-3xl">Sign in to continue</h1>
              </div>
              <div className="space-y-4 p-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Browse the marketplace as a guest. Sign in with Google to open listings, play the arcade, message
                  members and use your wallet.
                </p>
                <GoogleSignIn callbackURL={callbackURL} label="Sign in with Google" />
                <a
                  href={`/login?callbackURL=${encodeURIComponent(callbackURL)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f9fd6] hover:underline"
                >
                  <LogIn className="size-3.5" /> Email &amp; other sign-in options
                </a>
              </div>
            </section>
          )
        ) : (
          children
        )}
      </main>
      <SiteFooter />
      <PageScrollKeys />
      <AnalyticsBeacon />
    </div>
  );
}
