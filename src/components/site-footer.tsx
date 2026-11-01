import { Link } from "@tanstack/react-router";
import { ARTWORK } from "@/lib/artwork";
import { AccountButton } from "@/components/account-button";
import { LegalLinks } from "@/components/legal-links";
import { ShopSearch } from "@/components/shop-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-10 sm:px-6">
        {/* PayPal collab strip */}
        <div className="w-full overflow-hidden rounded-2xl border border-[#003087]/30 bg-gradient-to-r from-[#003087] via-[#009cde] to-[#003087] p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Payments partner
              </p>
              <p className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">
                Looters × PayPal
              </p>
              <p className="mt-1 max-w-md text-sm text-white/80">
                Deal direct. We never touch the money. Connect once in your
                account, then buy, sell or swap with confidence.
              </p>
            </div>
            <Link
              to="/account"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#ffc439] px-5 py-2.5 text-sm font-bold text-[#003087] shadow-lg hover:bg-[#ffd66b]"
            >
              Connect PayPal →
            </Link>
          </div>
        </div>

        <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
          <ShopSearch
            className="hidden min-w-0 flex-1 md:block"
            placeholder="Search marketplace"
            variant="plain"
          />
          <ThemeToggle desktopOnly />
          <AccountButton />
        </div>

        <nav
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground"
          aria-label="Footer"
        >
          <Link to="/sell" className="hover:text-foreground">
            Sell
          </Link>
          <Link to="/account" className="hover:text-foreground">
            Inbox
          </Link>
          <Link to="/hidden/forum" className="hover:text-foreground">
            Forum
          </Link>
          <Link to="/account" className="hover:text-foreground">
            Wallet / PayPal
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>

        <img
          src={ARTWORK.payments}
          alt="Accepted payment methods including PayPal, Visa, Mastercard and more"
          className="mx-auto h-auto w-full max-w-2xl opacity-90"
          loading="lazy"
          decoding="async"
        />

        <p className="text-center text-xs text-muted-foreground">
          &copy; 2026 Looters Computas. Marketplace deals settle via PayPal
          between users. Contact:{" "}
          <a
            href="mailto:looterscomputas@outlook.com"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            looterscomputas@outlook.com
          </a>
        </p>
        <LegalLinks className="text-muted-foreground [&_a]:text-muted-foreground [&_a:hover]:text-foreground" />
        <a href={SITE_URL} className="mt-1 block" aria-label="Looters Computas">
          <img
            src={ARTWORK.logoPurple}
            alt="Looters Computas"
            width={1191}
            height={433}
            className="mx-auto h-auto w-full max-w-xs"
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </footer>
  );
}
