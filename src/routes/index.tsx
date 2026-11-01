import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { BrandTicker } from "@/components/brand-ticker";
import { KeyLink } from "@/components/key-button";
import { ARTWORK } from "@/lib/artwork";

export const Route = createFileRoute("/")({
  component: Home,
});

const MARKETPLACE_CATEGORIES = [
  "Desktops",
  "Laptops",
  "Monitors",
  "Components",
  "GPUs",
  "Cables & Plugs",
  "Batteries",
  "Other",
] as const;

function Home() {
  return (
    <AppShell>
      <BrandTicker />
      <Rule />

      <p className="mx-auto max-w-3xl text-center text-sm font-semibold text-[#ff9a00] sm:text-base">
        Buy · Sell · Swap computer parts — community marketplace, same Looters
        vibe.
      </p>

      {/* Keyboard-style primary actions */}
      <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-3">
        <KeyLink to="/sell" tone="orange" size="fit">
          Sell / List an item
        </KeyLink>
        <KeyLink to="/account" tone="teal" size="fit">
          Your Account
        </KeyLink>
        <KeyLink to="/forum" tone="cream" size="fit">
          Community Forum
        </KeyLink>
        <KeyLink to="/arcade" tone="orange" size="fit">
          Arcade Games
        </KeyLink>
        <KeyLink to="/casino" tone="cream" size="fit">
          Gambling Games
        </KeyLink>
        <KeyLink to="/siftah" tone="orange" size="fit">
          Siftah Mobile
        </KeyLink>
      </div>

      {/* Category pills — marketplace browse (listings coming) */}
      <nav
        className="cat-nav mt-8"
        aria-label="Marketplace categories"
      >
        {MARKETPLACE_CATEGORIES.map((label) => (
          <Link
            key={label}
            to="/sell"
            className="cat-nav-item"
            title="Listings for this category coming soon — list yours now"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Rule />

      <section className="mx-auto my-8 max-w-2xl overflow-hidden rounded-2xl border-2 border-red-600 bg-black p-6 text-center text-white shadow-lg">
        <div className="animate-pulse text-4xl font-black tracking-widest text-red-500">
          SIFTAH MOBILE
        </div>
        <p className="mt-2 animate-bounce text-lg font-semibold text-white">
          Unrestricted AI ChatBot
        </p>
        <p className="mt-1 text-sm text-red-300">
          Super Saiyan power · Siftah 1–5 · Free trial then credits
        </p>
        <Link
          to="/siftah"
          className="mt-4 inline-block rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          Launch Siftah →
        </Link>
      </section>

      <div className="mt-4 space-y-8">
        <NewsCard date="Sat 31 Oct 2026" dateTime="2026-10-31">
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The community marketplace is opening up.
          </h1>
          <p className="text-sm font-medium text-[#ff9a00]">
            Fixed-price listings, swap offers, and direct PayPal between looters
            — we never touch the money.
          </p>

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>
              Looters Computas is becoming a community marketplace for computer
              parts. Sign in with Google, connect PayPal once when you're ready
              to deal, then list gear or make buy / swap offers.
            </p>
            <p>
              Inbox will have <strong className="text-foreground">Messages</strong>{" "}
              and a <strong className="text-foreground">Deals</strong> tab. Swap
              offers (photos + description) stay private to the listing owner.
            </p>
            <p>
              We're building this in the open. Browse categories above, list
              something from Sell, or set up your account — the rest is landing
              steadily.
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

        <NewsCard date="Wed 9 Sep 2026" dateTime="2026-09-09">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Shop's shut. The loot lives on.
          </h2>
          <p className="text-sm font-medium text-[#ff9a00]">
            Physical shop closed — the brand moves online as a trading platform.
          </p>

          <img
            src={ARTWORK.storefront}
            alt="The old Looters Computas storefront"
            width={1600}
            height={720}
            decoding="async"
            className="w-full rounded-xl border border-border object-cover"
          />

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              The orange front, the penguin on the footpath, PCs in the glass —
              that's the old days. Doors are shut. What continues is the name,
              the people, and a place for looters to buy, sell and swap parts
              with each other.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>
      </div>

      <div className="mt-10 flex flex-col items-center gap-8 pb-8 pt-4">
        <div className="flex flex-wrap justify-center gap-3">
          <KeyLink to="/sell" tone="orange">
            List something
          </KeyLink>
          <KeyLink to="/account" tone="teal">
            Account & PayPal
          </KeyLink>
        </div>
        <BrandLogo className="h-24 w-auto max-w-[360px] object-contain sm:h-32 sm:max-w-[480px]" />
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
