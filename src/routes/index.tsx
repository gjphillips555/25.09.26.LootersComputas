import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { BrandPicker } from "@/components/brand-picker";
import { BrandTicker } from "@/components/brand-ticker";
import { CategoryNav } from "@/components/category-nav";
import { KeyLink } from "@/components/key-button";
import { ProductGrid } from "@/components/product-grid";
import { RefineBar } from "@/components/refine-bar";
import { ShopSearch } from "@/components/shop-search";
import { ARTWORK } from "@/lib/artwork";
import { getCatalog } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  loader: () => getCatalog(),
  head: () => ({
    links: [
      {
        rel: "preload",
        as: "image",
        href: ARTWORK.storefront,
        type: "image/jpeg",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const catalog = Route.useLoaderData();

  return (
    <AppShell>
      <BrandTicker />
      <Rule />
      <p className="mx-auto max-w-3xl text-center text-sm font-semibold text-[#ff9a00] sm:text-base">
        Shop Now for great bargains on our range of refurbished Desktop PC's,
        Laptops, Graphics Cards, Components and other Accessories.
      </p>
      <BrandPicker />
      <CategoryNav />
      <div className="mx-auto mt-3 flex w-full max-w-lg justify-center px-1">
        <ShopSearch
          className="w-full"
          placeholder="Search products"
          variant="plain"
        />
      </div>
      <Rule />

      <div className="mt-4 space-y-8">
        {/* NEW — Marketplace announcement */}
        <NewsCard date="Sat 31 Oct 2026" dateTime="2026-10-31">
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Marketplace is on the way.
          </h1>
          <p className="text-sm font-medium text-[#ff9a00]">
            Buy · Sell · Swap computer parts — same Looters vibe, community
            powered.
          </p>

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>
              We're turning Looters Computas into a proper marketplace for
              computer parts. Fixed-price listings, swap offers, and direct
              PayPal / Skrill between users — we never touch the money.
            </p>
            <p>
              Sign in with Google, connect PayPal once when you're ready to
              deal, then list your gear or make offers. Inbox will have
              Messages and a Deals tab (swap offers stay private to the listing
              owner).
            </p>
            <p>
              The existing refurbished stock stays live while we finish the
              community side. We're building it in the open — expect steady
              updates over the next little while.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/account"
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Your Account
            </Link>
            <Link
              to="/sell"
              className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-5 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/20"
            >
              Sell / List an item
            </Link>
            <Link
              to="/terms"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Marketplace Terms
            </Link>
          </div>
        </NewsCard>

        <section className="overflow-hidden rounded-2xl border border-border">
          <img
            src={ARTWORK.afterpayTile}
            alt="Afterpay: prepaid card on your phone. Shop now, pay later."
            width={1600}
            height={900}
            decoding="async"
            className="w-full object-cover"
          />
        </section>
        <Rule />

        <NewsCard date="Wed 9 Sep 2026" dateTime="2026-09-09">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Shop's shut. The loot lives on.
          </h2>
          <p className="text-sm font-medium text-[#ff9a00]">
            Loot the best deals on refurbished gear — now from the spare room,
            not the shop floor.
          </p>

          <img
            src={ARTWORK.storefront}
            alt="The old Looters Computas storefront: orange and purple shop front, penguin mascot, Afterpay window, and a Refurbished HP ProDesk 400 in the display"
            width={1600}
            height={720}
            fetchPriority="high"
            decoding="async"
            className="w-full rounded-xl border border-border object-cover"
          />

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>
              We've closed the physical Looters Computas shop. That orange
              front with the penguin out on the footpath, Afterpay in the
              window, PCs stacked in the glass — that's the old days. Doors
              are shut. We're not trading from the street anymore.
            </p>
            <p>
              We're working from home now. Same people, same refurbished
              gear, just no shop bell. From here on, everything is going to
              be shipped. No walk-ins, no "I'll swing by after work" — if
              you want it, it goes in a box and it comes to you.
            </p>
            <p>
              This website only just went live today, 9 September 2026.
              It's the new shop floor. Have a rummage through Desktops,
              Laptops and Components, chuck finds in the cart, pick your
              shipping on the product page, and we'll tally the total in
              NZD. PayPal's there if you'd rather skip the cart.
            </p>
            <p>
              Give us a bit of grace while we get the online thing humming
              — first week energy, forum-post honesty. The stock is live.
              The deals are the same. The penguin just doesn't have a
              footpath anymore.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>

        <NewsCard date="Wed 9 Sep 2026" dateTime="2026-09-09">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Afterpay's still on the table
          </h2>
          <p className="text-sm font-medium text-accent">
            Shop now. Pay later. Always interest-free — four payments, every
            two weeks.
          </p>
          <img
            src={ARTWORK.afterpayNews}
            alt="Afterpay: Shop now, pay it in 4 interest-free instalments."
            width={2201}
            height={1101}
            className="w-full rounded-xl"
            loading="lazy"
            decoding="async"
          />
          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Want the gear now and spread the cost? Afterpay splits the
              total into four interest-free payments, fortnightly. First
              payment's due when you buy, then three more every two weeks.
            </p>
            <p>
              Afterpay is available when you hit the{" "}
              <span className="font-medium text-foreground">
                Pay via Trade Me
              </span>{" "}
              button on a product or at checkout. Trade Me's checkout is
              where Afterpay shows up — pick it there, log into or create
              your Afterpay account, and you're away. You need a debit or
              credit card, to be 18+, and a NZ resident. Late fees and
              eligibility criteria apply.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>

        <NewsCard date="Thu 10 Sep 2026" dateTime="2026-09-10">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
            We bought the .online
          </h2>
          <p className="text-sm font-medium text-[#ff9a00]">
            looterscomputas.online — grabbed from Porkbun. That's the name on
            the door now.
          </p>
          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Domain's ours. Bought looterscomputas.online through Porkbun so
              the shop has a proper address, not just a Vercel URL hanging off
              the side.
            </p>
            <p>
              Bookmark that. Share that. If it still says
              looterscomputas-online.vercel.app in a tab somewhere, that's the
              old scaffolding — this is the one.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>
      </div>

      <div id="browse" className="mb-4 mt-10 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">Browse the loot</h2>
        <p className="text-sm text-muted-foreground">Afterpay Available Now!</p>
      </div>
      <RefineBar products={catalog.products} />
      <ProductGrid
        products={catalog.products}
        error={catalog.error}
        unfiltered
        layout="grid"
      />

      <div className="mt-6 flex flex-col items-center gap-12 pb-4 pt-4">
        <KeyLink to="/shop" tone="teal">
          All products
        </KeyLink>
        <BrandLogo className="mt-2 h-28 w-auto max-w-[420px] object-contain sm:h-36 sm:max-w-[520px]" />
      </div>
    </AppShell>
  );
}

function Rule() {
  return (
    <div className="my-5 space-y-1" aria-hidden="true">
      <div className="h-px w-full bg-black" />
      <div className="h-px w-full bg-[#ff9a00]" />
    </div>
  );
}

function NewsCard({
  date,
  dateTime,
  children,
}: {
  date: string;
  dateTime: string;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:px-6">
        <span className="rounded bg-[#ff9a00] px-1.5 py-0.5 text-[10px] font-bold text-[#1a1000]">
          Site news
        </span>
        <span aria-hidden="true">·</span>
        <time dateTime={dateTime}>{date}</time>
        <span aria-hidden="true">·</span>
        <span>Posted today</span>
        <span className="ml-auto normal-case tracking-normal">Looters</span>
      </header>
      <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </article>
  );
}
