import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Monitor,
  Laptop,
  Gamepad2,
  Joystick,
  Cpu,
  Tv,
  Plane,
  Bike,
  Zap,
  Smartphone,
  Plug,
  Fan,
  Watch,
  CircuitBoard,
  Gem,
  ShieldCheck,
  Users,
  RefreshCw,
  Star,
  Wallet,
  MessageSquare,
  MessagesSquare,
  Store,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { BrandTicker } from "@/components/brand-ticker";
import { ShopSearch } from "@/components/shop-search";
import { ARTWORK } from "@/lib/artwork";

export const Route = createFileRoute("/")({
  component: Home,
});

const CATEGORIES = [
  { label: "Computers", icon: Monitor },
  { label: "Laptops", icon: Laptop },
  { label: "Gaming", icon: Gamepad2 },
  { label: "Games", icon: Joystick },
  { label: "Components", icon: Cpu },
  { label: "TVs", icon: Tv },
  { label: "Drones", icon: Plane },
  { label: "E-Bikes", icon: Bike },
  { label: "E-Scooters", icon: Zap },
  { label: "Cellphones", icon: Smartphone },
  { label: "Chargers", icon: Plug },
  { label: "Vacuums", icon: Fan },
  { label: "Watches", icon: Watch },
  { label: "Other Gadgets", icon: CircuitBoard },
  { label: "Collectables", icon: Gem },
] as const;

function Home() {
  return (
    <AppShell>
      <BrandTicker />




      <section className="relative mt-2 bg-transparent">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(255,154,0,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(147,51,234,0.22), transparent 50%)",
          }}
        />
        <div className="relative grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9a00]">
              Tech · Gaming · Gadgets · Real deals
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              BUY. SELL.
              <br />
              SWAP. TRADE.
              <br />
              <span className="bg-gradient-to-r from-[#ff9a00] to-[#ffc14d] bg-clip-text text-transparent">
                GET REAL DEALS.
              </span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              NZ marketplace for computers, laptops, gaming gear, components,
              phones, drones, e-bikes, scooters and more. Same penguin. Powered
              by PayPal between looters.
            </p>

            {/* Marketplace search — primary finder */}
            <div className="hidden max-w-xl pt-1 md:block">
              <ShopSearch
                variant="hero"
                placeholder="Search laptops, GPUs, phones, drones…"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Try “RTX”, “MacBook”, “iPhone”, “e-bike” — or pick a category below.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <TrustPill>PayPal — Safe & Secure</TrustPill>
              <TrustPill>Verified Users</TrustPill>
              <TrustPill>Swap + Cash</TrustPill>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/sell"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff9a00] px-5 py-2.5 text-sm font-bold text-[#1a1000] shadow-lg shadow-orange-500/25 hover:bg-[#ffb020]"
              >
                <Store className="size-4" />
                Start Trading
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur-sm hover:bg-secondary"
              >
                <UserPlus className="size-4" />
                Not yet a member? Sign Up
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

      <section className="siftah-mini-ad relative mx-auto mt-1 w-full max-w-6xl overflow-hidden rounded-xl bg-transparent text-white" aria-label="Siftah Mobile advertisement">
        <style>{`
          @keyframes siftahMatrixFlicker {
            0%, 7%, 9%, 11%, 45%, 47%, 49%, 100% { opacity: 1; filter: none; transform: translate(0,0); }
            8% { opacity: .35; filter: hue-rotate(95deg); transform: translate(3px,-1px); }
            10% { opacity: .7; filter: contrast(1.8); transform: translate(-3px,1px); }
            46% { opacity: .45; filter: hue-rotate(140deg); transform: translate(-2px,0); }
            48% { opacity: .8; filter: contrast(1.5); transform: translate(2px,1px); }
          }
          @keyframes siftahMatrixText {
            0%, 5%, 8%, 10%, 42%, 45%, 48%, 100% { opacity: 1; clip-path: inset(0 0 0 0); text-shadow: 2px 2px 0 #071b0c, -1px 0 #ff263b; transform: translate(0,0); }
            6% { opacity: .35; clip-path: inset(12% 0 62% 0); text-shadow: 3px 0 #36ff79, -3px 0 #ff263b; transform: translate(3px,-1px); }
            7% { opacity: .8; clip-path: inset(58% 0 12% 0); text-shadow: -3px 0 #36ff79, 2px 0 #ff263b; transform: translate(-2px,1px); }
            43% { opacity: .45; clip-path: inset(35% 0 38% 0); text-shadow: 4px 0 #36ff79, -2px 0 #ff263b; transform: translate(-3px,0); }
            46% { opacity: .7; clip-path: inset(0 0 72% 0); text-shadow: -3px 0 #36ff79, 3px 0 #ff263b; transform: translate(2px,1px); }
          }
          @keyframes siftahMatrixScan {
            0% { transform: translateY(-130%); opacity: 0; }
            12%, 82% { opacity: .55; }
            100% { transform: translateY(330%); opacity: 0; }
          }
          .siftah-matrix-logo { animation: siftahMatrixFlicker 6.2s steps(1,end) infinite; }
          .siftah-matrix-copy { animation: siftahMatrixText 5.4s steps(1,end) infinite; }
          .siftah-matrix-scan { animation: siftahMatrixScan 4.8s linear infinite; }
          .siftah-matrix-green { color: #b8ffc9; text-shadow: 2px 2px 0 #071b0c, -1px 0 #ff263b; }
          @media (max-width: 520px) {
            .siftah-matrix-link { gap: .55rem; min-height: 230px; padding: .8rem .35rem; }
            .siftah-matrix-logo { height: 9rem; max-width: 39%; }
            .siftah-matrix-title { font-size: clamp(1.35rem, 6vw, 2rem); }
            .siftah-matrix-desc { font-size: clamp(.9rem, 3.8vw, 1.08rem); line-height: 1.25; }
          }
          @media (prefers-reduced-motion: reduce) {
            .siftah-matrix-logo,.siftah-matrix-copy,.siftah-matrix-scan { animation: none !important; }
          }
        `}</style>
        <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-green-500/10 blur-3xl" />
        <div className="siftah-matrix-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-transparent via-green-300/15 to-transparent" />
        <Link to="/siftah" className="siftah-matrix-link relative flex min-h-[230px] items-center justify-center gap-5 px-3 py-4 transition sm:min-h-[260px] sm:gap-8 sm:px-8">
          <img src="/siftah-mobile-logo.svg" alt="Siftah Mobile" className="siftah-matrix-logo h-52 w-auto max-w-[43%] shrink-0 object-contain drop-shadow-[0_0_18px_rgba(34,255,105,.28)] sm:h-60" />
          <span className="siftah-matrix-copy min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-[.22em] text-green-200 sm:text-sm" style={{WebkitTextStroke:"1px #050505",paintOrder:"stroke fill"}}>AI-powered computing</span>
            <span className="siftah-matrix-title siftah-matrix-green block text-2xl font-black leading-[1.05] sm:text-4xl" style={{WebkitTextStroke:"1.5px #050505",paintOrder:"stroke fill"}}>Meet Siftah Mobile</span>
            <span className="siftah-matrix-desc mt-2 block text-base font-extrabold leading-snug text-white sm:text-xl" style={{WebkitTextStroke:"1px #050505",paintOrder:"stroke fill"}}>AI chat, coding help, app building and creative tools.</span>
            <span className="mt-2 block text-sm font-bold text-green-200 sm:text-base" style={{WebkitTextStroke:"1px #050505",paintOrder:"stroke fill"}}>Your ideas. Built at the speed of thought.</span>
          </span>
          <span className="shrink-0 rounded-lg border border-green-300/50 bg-green-500/15 px-3 py-2 text-xs font-extrabold text-green-100 shadow-md shadow-green-950/40 transition hover:bg-green-500/30 sm:text-sm">Explore <span aria-hidden="true">→</span></span>
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink to="/sell" icon={Store} label="Sell / List" hint="List gear" />
        <QuickLink to="/account" icon={MessageSquare} label="Inbox" hint="Messages & deals" />
        <QuickLink to="/hidden/forum" icon={MessagesSquare} label="Forum" hint="Community den" />
        <QuickLink to="/account" icon={Wallet} label="Wallet" hint="Connect PayPal" />
      </section>

      <section className="mt-8" aria-label="Marketplace categories">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Browse categories
            </h2>
            <p className="text-sm text-muted-foreground">
              Computers · gaming · gadgets · mobility · collectables
            </p>
          </div>
          <Link to="/sell" className="text-sm font-medium text-[#ff9a00] hover:underline">
            List yours
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-5">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <Link
              key={label}
              to="/sell"
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center transition hover:border-[#ff9a00]/40 hover:bg-secondary/60"
              title={`${label} — list yours now`}
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

      <section className="mt-8 overflow-hidden rounded-2xl border border-[#003087]/25 bg-gradient-to-r from-[#003087] to-[#009cde]">
        <div className="flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Official payments rail
            </p>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              Looters Computas × PayPal
            </h2>
            <p className="max-w-lg text-sm text-white/80">
              Buyer and seller settle direct. Looters never holds funds. Connect
              PayPal once in your account — then trade with anyone on the
              platform.
            </p>
          </div>
          <Link
            to="/account"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#ffc439] px-5 py-2.5 text-sm font-bold text-[#003087] hover:bg-[#ffd66b]"
          >
            <Wallet className="size-4" />
            Open Wallet
          </Link>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-[#2a1545] to-[#1a0b2e]">
        <div className="flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              Make a deal. Join the community.
            </h2>
            <p className="text-sm text-white/70">
              Trade · Swap · Sell · Buy · Forum · Feedback
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hidden/forum"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Open Forum
            </Link>
            <Link
              to="/account"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Inbox
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25"
            >
              Not yet a member? Sign Up
            </Link>
            <Link
              to="/sell"
              className="rounded-full bg-[#ff9a00] px-3 py-1.5 text-xs font-bold text-[#1a1000] hover:bg-[#ffb020]"
            >
              List an item
            </Link>
          </div>
        </div>
      </section>

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
            Tech & gadgets marketplace.
          </h2>
          <p className="text-sm font-medium text-[#ff9a00]">
            Computers, laptops, gaming, components, phones, drones, e-bikes and
            more — direct PayPal between looters.
          </p>

          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>
              Looters Computas is a community marketplace for computers,
              laptops, gaming gear, games, components, TVs, drones, e-bikes,
              e-scooters, cellphones, chargers, vacuums, watches, other gadgets
              and collectables. Sign in with Google, connect PayPal once when
              you're ready to deal, then list gear or make buy / swap offers.
            </p>
            <p>
              Use <strong className="text-foreground">Inbox</strong> for
              messages and deals, <strong className="text-foreground">Forum</strong>{" "}
              for the community den, and <strong className="text-foreground">Wallet</strong>{" "}
              to link PayPal.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/login"
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Not yet a member? Sign Up
            </Link>
            <Link
              to="/account"
              className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-5 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/20"
            >
              Account & Wallet
            </Link>
            <Link
              to="/sell"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sell / List an item
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
              the people, and a place for looters to buy, sell and swap tech and
              gadgets with each other.
            </p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 pb-8 pt-4">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-xl bg-[#ff9a00] px-5 py-2.5 text-sm font-bold text-[#1a1000] hover:bg-[#ffb020]"
          >
            Not yet a member? Sign Up
          </Link>
          <Link
            to="/sell"
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            List something
          </Link>
        </div>
        <BrandLogo className="h-24 w-auto max-w-[360px] object-contain sm:h-32 sm:max-w-[480px]" />
        <Link to="/siftah" className="inline-flex items-center justify-center rounded-xl p-2 transition hover:scale-[1.03]" aria-label="Open Siftah Mobile">
          <img src="/siftah-mobile-logo.svg" alt="Siftah Mobile" className="h-28 w-auto max-w-[180px] object-contain" loading="lazy" />
        </Link>
      </div>
    </AppShell>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: "/sell" | "/account" | "/hidden/forum";
  icon: typeof Store;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition hover:border-[#ff9a00]/40 hover:bg-secondary/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff9a00]/15 text-[#ff9a00]">
        <Icon className="size-4" strokeWidth={1.85} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}

function TrustPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
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
        <Icon className="h-4 w-4" strokeWidth={1.75} />
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
