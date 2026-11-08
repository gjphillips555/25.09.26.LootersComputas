import type { ReactNode } from "react";
import { useLocation, Link } from "@tanstack/react-router";
import { PageScrollKeys } from "@/components/page-scroll-keys";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isPending } = useCurrentUserState();
  const path = location.pathname;
  const publicBrowse = path === "/" || path === "/shop" || path.startsWith("/shop/");
  const signInRequired = authEnabled && !publicBrowse && (isPending || !user);
  const callbackURL = path + (location.searchStr || "");

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <SiteHeader />
      <main className="shell-main mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {signInRequired ? (
          isPending ? (
            <div className="py-24 text-center text-sm text-muted-foreground">Checking your Looters account…</div>
          ) : (
            <section className="mx-auto my-16 max-w-lg rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
              <h1 className="font-display text-2xl font-semibold">Sign in to continue</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                You can browse listing thumbnails as a guest. Sign in with Google or an email address, including Proton Mail, to open a listing and use the marketplace.
              </p>
              <a
                href={`/login?callbackURL=${encodeURIComponent(callbackURL)}`}
                className="mt-6 inline-flex rounded-xl bg-[#ff9a00] px-6 py-3 font-semibold text-[#1a1000] hover:bg-amber-400"
              >
                Sign in / Create account
              </a>
            </section>
          )
        ) : children}
      </main>
      <SiteFooter />
      <PageScrollKeys />
      <AnalyticsBeacon />
      {path !== "/" && (
        <Link
          to="/"
          title="Return to Looters Computas"
          className="fixed bottom-4 left-4 z-50 flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-lg hover:bg-secondary"
          aria-label="Return to Looters Computas"
        >
          <span className="text-lg">←</span>
        </Link>
      )}
    </div>
  );
}
