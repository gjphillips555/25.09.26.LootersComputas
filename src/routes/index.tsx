import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Laptop,
  Smartphone,
  Gamepad2,
  Tv,
  Sofa,
  Car,
  Bike,
  Shirt,
  MoreHorizontal,
  ShieldCheck,
  Users,
  RefreshCw,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { BrandTicker } from "@/components/brand-ticker";
import { KeyLink } from "@/components/key-button";
import { ARTWORK } from "@/lib/artwork";

export const Route = createFileRoute("/")({
  component: Home,
});

const CATEGORIES = [
  { label: "Computers & Laptops", icon: Laptop, to: "/sell" as const },
  { label: "Phones & Tablets", icon: Smartphone, to: "/sell" as const },
  { label: "Gaming", icon: Gamepad2, to: "/sell" as const },
  { label: "TVs & Audio", icon: Tv, to: "/sell" as const },
  { label: "Home & Living", icon: Sofa, to: "/sell" as const },
  { label: "Vehicles", icon: Car, to: "/sell" as const },
  { label: "Sports & Outdoors", icon: Bike, to: "/sell" as const },
  { label: "Fashion", icon: Shirt, to: "/sell" as const },
  { label: "More", icon: MoreHorizontal, to: "/sell" as const },
] as const;

function Home() {
  return (
    <AppShell>
      <BrandTicker />

      {/* Hero — matches brand board */}
      <section className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1a0b2e] via-[#2a1545] to-[#0f0618]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(255,154,0,0.25), transparent 55%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(147,51,234,0.35), transparent 50%)",
          }}
        />
        <div className="relative grid gap-8 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a00]">
              Marketplace · Community · Real deals
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              BUY. SELL.
              <br />
              SWAP. TRADE.
              <br />
              <span className="bg-gradient-to-r from-[#ff9a00] to-[#ffc14d] bg-clip-text text-transparent">
                GET REAL DEALS.
              </span>
            </h1>
            <p className="max-w-xl text-base text-white/75 sm:text-lg">
              The all-in-one marketplace for people, not just computers. Same
              penguin. Bigger community.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <TrustPill>PayPal Payments — Safe & Secure</TrustPill>
              <TrustPill>Verified Users — Real Feedback</TrustPill>
              <TrustPill>Swap + Cash — Make it Happen</TrustPill>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/sell"
                className="inline-flex items-center justify-center rounded-xl bg-[#ff9a00] px-5 py-2.5 text-sm font-bold text-[#1a1000] shadow-lg shadow-orange-500/25 hover:bg-[#ffb020]"
              >
                Start Trading →
              </Link>
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                My Account
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <img
              src={ARTWORK.logoOrange}
              alt="Looters Computas"
              width={420}
              height={280}
              decoding="async"
              className="h-auto w-full max-w-[280px] object-contain drop-shadow-2xl sm:max-w-[340px]"
            />
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="mt-8" aria-label="Popular categories">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Browse categories
          </h2>
          <Link
            to="/sell"
            className="text-sm font-medium text-[#ff9a00] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-9">
          {CATEGORIES.map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center transition hover:border-[#ff9a00]/40 hover:bg-secondary/60"
              title="Listings for this category coming soon — list yours now"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-[#ff9a00] transition group-hover:bg-[#ff9a00]/15">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted-foreground group-hover:text-foreground sm:text-xs">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Primary actions — keyboard style kept for brand continuity */}
      <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3">
        <KeyLink to="/sell" tone="orange" size="fit">
          Sell / List an item
        </KeyLink>
        <KeyLink to="/account" tone="teal" size="fit">
          Your Account
        </KeyLink>
        <KeyLink to="/inbox" tone="cream" size="fit">
          Inbox
        </KeyLink>
      </div>

      {/* Community banner */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-[#2a1545] to-[#1a0b2e]">
        <div className="flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              Make a deal. Join the community.
            </h2>
            <p className="text-sm text-white/70">
              Trade. Swap. Sell. Buy. Give feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              PayPal Payments
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              User Feedback
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              Swap + Cash
            </span>
          </div>
        </div>
      </section>

      {/* Trust row */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TrustCard
          icon={Users}
          title="Real People"
          body="Real deals between looters — not a faceless store."
        />
        <TrustCard
          icon={ShieldCheck}
          title="Verified Users & Feedback"
          body="Build reputation. See who you're dealing with."
        />
        <TrustCard
          icon={RefreshCw}
          title="Swap + Cash Options"
          body="Trade gear, top up with cash, or buy outright."
        />
        <TrustCard
          icon={Star}
          title="Build Your Reputation"
          body="Every successful deal strengthens your profile."
        />
      </section>

      <Rule />

      <div className="mt-4 space-y-8">
        <NewsCard date="Sat 31 Oct 2026" dateTime="2026-10-31">
          <h2 className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Marketplace is live in spirit.
          </h2>
          <p className="text-sm font-medium text-[#ff9a00]">
            Fixed-price listings, swap offers, and direct PayPal between looters
            — we never touch the money.
          </p>

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>
              Looters Computas is becoming a community marketplace for computer
              parts and beyond. Sign in with Google, connect PayPal once when
              you're ready to deal, then list gear or make buy / swap offers.
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

function TrustPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
      {children}
    </span>
  );
}

function TrustCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff9a00]/15 text-[#ff9a00]">
        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
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
