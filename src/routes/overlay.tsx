import { Link, createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { LegalLinks } from "@/components/legal-links";
import { OverlayStudio } from "@/components/overlay-studio";
import { useTheme } from "@/lib/theme";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/overlay")({
  component: OverlayPage,
  head: () => ({
    meta: [
      { title: "Overlay Studio · Looters Computas" },
      {
        name: "description",
        content:
          "Stamp a pile of listing photos with the header logo and download a zip. Separate from the shop.",
      },
    ],
  }),
});

/** Plain theme control — no shop keyboard (F5/F6) styling. */
function PlainThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** Minimal chrome — full wordmark, no shop BrandLogo / keyboard chrome. */
function OverlayPage() {
  const { user, isPending } = useCurrentUserState();
  if (authEnabled && (isPending || !user)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <section className="max-w-md rounded-2xl border border-border bg-card p-7">
          <h1 className="font-display text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-3 text-sm text-muted-foreground">Create or sign in to your Looters account to use this tool.</p>
          <a href="/login?callbackURL=%2Foverlay" className="mt-6 inline-flex rounded-xl bg-[#ff9a00] px-6 py-3 font-semibold text-[#1a1000]">Sign in / Create account</a>
        </section>
      </main>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3"
            aria-label="Back to shop"
          >
            {/* Full LOOTERS COMPUTAS wordmark — not cropped */}
            <img
              src="/artwork/logo-mark.png"
              alt="Looters Computas"
              width={866}
              height={288}
              decoding="async"
              className="h-10 w-auto max-h-10 object-contain object-left sm:h-11 sm:max-h-11"
            />
          </Link>
          <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            Overlay Studio
          </span>
          <div className="ml-auto flex items-center gap-2">
            <PlainThemeToggle />
            <Link
              to="/"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              ← Shop
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <OverlayStudio />
      </main>
      <footer className="border-t border-border py-6">
        <LegalLinks />
      </footer>
    </div>
  );
}
