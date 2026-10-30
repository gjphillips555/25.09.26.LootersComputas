import { ARTWORK } from "@/lib/artwork";
import { AccountButton } from "@/components/account-button";
import { CartButton } from "@/components/cart-button";
import { LegalLinks } from "@/components/legal-links";
import { ShopSearch } from "@/components/shop-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_URL } from "@/lib/site";

export function SiteFooter({ onOpenCart }: { onOpenCart: () => void }) {
  return (
    <footer className="mt-16 bg-white text-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
          <ShopSearch
            className="min-w-0 flex-1"
            placeholder="Search products"
            variant="plain"
          />
          <ThemeToggle desktopOnly />
          <AccountButton />
          <CartButton onClick={onOpenCart} />
        </div>
        <img
          src={ARTWORK.afterpay}
          alt="Afterpay: Shop now. Pay later. Always interest-free. Split your purchase into 4 payments, payable every 2 weeks."
          width={600}
          height={600}
          className="mx-auto h-auto w-full max-w-3xl"
          loading="lazy"
          decoding="async"
        />
        <img
          src={ARTWORK.payments}
          alt="Accepted payment methods: Amex, Apple Pay, Diners Club, Discover, Google Pay, JCB, Mastercard, PayPal and Visa"
          className="mx-auto h-auto w-full max-w-3xl"
          loading="lazy"
          decoding="async"
        />
        <p className="text-center text-xs text-neutral-600">
          &copy; 2026 Looters Computas. Prices in NZD, GST inclusive. Contact:{" "}
          <a
            href="mailto:looterscomputas@outlook.com"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            looterscomputas@outlook.com
          </a>
        </p>
        <LegalLinks className="text-neutral-600 [&_a]:text-neutral-600 [&_a:hover]:text-neutral-900" />
        <a href={SITE_URL} className="mt-2 block" aria-label="Looters Computas">
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
