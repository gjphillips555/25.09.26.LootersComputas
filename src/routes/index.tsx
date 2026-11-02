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
import { SiftahMatrixAd } from "@/components/siftah-matrix-ad";
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

      <SiftahMatrixAd />

      <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink to="/sell" icon={Store} label="Sell / List" hint="List gear" />
        <QuickLink to="/siftah-message" icon={MessageSquare} label="Message" hint="Siftah Message" />
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
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Official payments rail
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span
                className="font-display text-3xl font-black tracking-tight sm:text-4xl"
                style={{
                  background: "linear-gradient(180deg, #ffb020 0%, #ff9a00 45%, #e85d04 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  WebkitTextStroke: "0.5px rgba(0,0,0,0.35)",
                  filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.25))",
                }}
              >
                Looters
              </span>
              <span className="text-2xl font-black text-white/90 sm:text-3xl" aria-hidden="true">
                ×
              </span>
              <span className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 shadow-sm">
                <svg role="img" aria-label="PayPal" viewBox="0 0 124 33" className="h-6 w-auto sm:h-7">
                  <path fill="#003087" d="M46.211 6.749h-6.839a.95.95 0 0 0-.936.803l-2.768 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .936-.803l.746-4.73a.95.95 0 0 1 .936-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.967-1.137-2.678-1.747-4.981-1.747zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.479h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.904zM66.654 13.075h-3.275a.57.57 0 0 0-.563.479l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.968 1.143 2.357 1.62 4.022 1.62 2.848 0 4.425-1.841 4.425-1.841l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .936-.803l1.77-11.209a.568.568 0 0 0-.562-.654zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.976 0-1.746-.312-2.229-.902-.482-.589-.668-1.429-.514-2.363.295-1.855 1.805-3.152 3.67-3.152.968 0 1.746.321 2.236.92.479.59.657 1.414.532 2.37zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.421 4.83a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.37l10.946-15.8a.57.57 0 0 0-.468-.902z" />
                  <path fill="#009cde" d="M94.992 6.749h-6.84a.95.95 0 0 0-.935.803l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .936-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.966-1.137-2.677-1.747-4.984-1.747zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.479h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.904zM115.434 13.075h-3.273a.567.567 0 0 0-.562.479l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.71 2.741-7.312 6.586-.312 1.918.132 3.752 1.219 5.031.969 1.143 2.359 1.62 4.024 1.62 2.848 0 4.424-1.841 4.424-1.841l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .936-.803l1.771-11.209a.571.571 0 0 0-.565-.654zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.976 0-1.746-.312-2.229-.902-.482-.589-.668-1.429-.514-2.363.295-1.855 1.805-3.152 3.67-3.152.968 0 1.746.321 2.236.92.48.59.658 1.414.532 2.37zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.935-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.326a.57.57 0 0 0-.392.482z" />
                  <path fill="#003087" d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.337.337 0 0 1 .332-.288h6.896c2.289 0 3.875.479 4.713 1.422.753.849.976 2.1.668 3.718l-.012.078v.676l.527.298a4.98 4.98 0 0 1 1.385.987c.484.543.817 1.236.99 2.06.179.854.163 1.867-.047 3.01-.244 1.326-.648 2.467-1.202 3.387-.517.859-1.15 1.556-1.882 2.07-.703.494-1.518.855-2.422 1.074-.87.212-1.826.317-2.84.317H8.527a.934.934 0 0 0-.923.748l-.027.14-.506 3.212-.023.115c-.022.115-.063.15-.14.15H7.266z" />
                  <path fill="#009cde" d="M23.048 7.667c-.028.179-.06.373-.096.572-.99 5.072-4.378 6.823-8.715 6.823H11.95a.935.935 0 0 0-.923.747l-.824 5.222-.233 1.479a.484.484 0 0 0 .478.556h3.346c.4 0 .74-.29.803-.687l.033-.172.636-4.032.041-.222a.81.81 0 0 1 .802-.687h.505c3.265 0 5.821-1.326 6.57-5.16.312-1.6.15-2.936-.655-3.88a3.81 3.81 0 0 0-1.15-.96z" />
                  <path fill="#012169" d="M21.754 7.151a9.57 9.57 0 0 0-1.204-.267 15.34 15.34 0 0 0-2.426-.177h-5.433a.934.934 0 0 0-.923.803l-1.37 8.685-.035.222.012-.078.824-5.221a.935.935 0 0 1 .923-.748h2.287c4.337 0 7.725-1.751 8.715-6.823.036-.199.068-.393.096-.572a4.7 4.7 0 0 0-.746-.426c-.26-.126-.545-.23-.84-.318z" />
                </svg>
              </span>
            </div>
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
            <p className="text-sm text-white/70">Trade · Swap · Sell · Buy · Forum · Feedback</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/hidden/forum" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">Open Forum</Link>
            <Link to="/siftah-message" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">Siftah Message</Link>
            <Link to="/login" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25">Not yet a member? Sign Up</Link>
            <Link to="/sell" className="rounded-full bg-[#ff9a00] px-3 py-1.5 text-xs font-bold text-[#1a1000] hover:bg-[#ffb020]">List an item</Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TrustCard icon={Users} title="Real People" body="Real deals between looters — not a faceless store." />
        <TrustCard icon={ShieldCheck} title="Verified Users & Feedback" body="Build reputation. See who you're dealing with." />
        <TrustCard icon={RefreshCw} title="Swap + Cash Options" body="Trade gear, top up with cash, or buy outright." />
        <TrustCard icon={Star} title="Build Your Reputation" body="Every successful deal strengthens your profile." />
      </section>

      <Rule />

      <div className="mt-4 space-y-8">
        <NewsCard date="Sat 31 Oct 2026" dateTime="2026-10-31">
          <h2 className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">Tech & gadgets marketplace.</h2>
          <p className="text-sm font-medium text-[#ff9a00]">Computers, laptops, gaming, components, phones, drones, e-bikes and more — direct PayPal between looters.</p>
          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>G'day everyone.</p>
            <p>Looters Computas is a community marketplace for computers, laptops, gaming gear, games, components, TVs, drones, e-bikes, e-scooters, cellphones, chargers, vacuums, watches, other gadgets and collectables. Sign in with Google, connect PayPal once when you're ready to deal, then list gear or make buy / swap offers.</p>
            <p>Use <strong className="text-foreground">Siftah Message</strong> to chat, <strong className="text-foreground">Forum</strong> for the community den, and <strong className="text-foreground">Wallet</strong> to link PayPal.</p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/login" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">Not yet a member? Sign Up</Link>
            <Link to="/account" className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-5 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/20">Account & Wallet</Link>
            <Link to="/sell" className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">Sell / List an item</Link>
          </div>
        </NewsCard>

        <NewsCard date="Wed 9 Sep 2026" dateTime="2026-09-09">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">Shop's shut. The loot lives on.</h2>
          <p className="text-sm font-medium text-[#ff9a00]">Physical shop closed — the brand moves online as a trading platform.</p>
          <img src={ARTWORK.storefront} alt="The old Looters Computas storefront" width={1600} height={720} decoding="async" className="w-full rounded-xl border border-border object-cover" />
          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>The orange front, the penguin on the footpath, PCs in the glass — that's the old days. Doors are shut. What continues is the name, the people, and a place for looters to buy, sell and swap tech and gadgets with each other.</p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 pb-8 pt-4">
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/login" className="rounded-xl bg-[#ff9a00] px-5 py-2.5 text-sm font-bold text-[#1a1000] hover:bg-[#ffb020]">Not yet a member? Sign Up</Link>
          <Link to="/sell" className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary">List something</Link>
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
  to: "/sell" | "/account" | "/hidden/forum" | "/siftah-message";
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

function TrustCard({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
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

function NewsCard({ date, dateTime, children }: { date: string; dateTime: string; children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:px-6">
        <span className="rounded bg-[#ff9a00] px-1.5 py-0.5 text-[10px] font-bold text-[#1a1000]">Site news</span>
        <span aria-hidden="true">·</span>
        <time dateTime={dateTime}>{date}</time>
        <span className="ml-auto normal-case tracking-normal">Looters</span>
      </header>
      <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </article>
  );
}
