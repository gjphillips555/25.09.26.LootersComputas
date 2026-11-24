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
  CarFront,
  Sparkles,
  ShoppingBag,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SiftahLogo } from "@/components/siftah/brand";
import { BrandTicker } from "@/components/brand-ticker";
import { ShopSearch } from "@/components/shop-search";
import { SiftahMatrixAd } from "@/components/siftah-matrix-ad";
import { ARTWORK } from "@/lib/artwork";

export const Route = createFileRoute("/")({
  // Canonical lives here (not in __root) so other pages don't all point search engines at the home page.
  head: () => ({ links: [{ rel: "canonical", href: "https://www.looterscomputas.online/" }] }),
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
      <section className="siftah-hero relative -mx-4 -mt-[1.1rem] overflow-hidden px-4 pb-10 pt-8 text-white sm:-mx-6 sm:rounded-b-[2rem] sm:px-8 sm:pt-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[28px] border-[#e3121b]/25" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#5cc8f2]">
              <span className="size-1.5 rounded-full bg-[#5cc8f2]" /> Siftah Solutions · NZ
            </p>
            <h1 className="font-display text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-[4.1rem]">
              Make it.
              <br />
              <span className="text-[#e3121b]">Print it.</span>
              <br />
              <span className="siftah-sticker-text">Trade it.</span>
            </h1>
            <p className="max-w-xl text-base text-white/75 sm:text-lg">
              True-size NZ plate stickers, a free arcade, Mr CluedUp AI chat and a marketplace to buy, sell and swap
              tech — all in one app from Siftah Solutions, trading as looterscomputas.online.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/plates/index.html"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#e3121b] px-5 py-3 font-display text-base text-white shadow-[0_10px_30px_-10px_rgba(227,18,27,0.8)] hover:bg-[#ff2a33]"
              >
                <CarFront className="size-5" /> Open Plate maker
              </a>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                <Store className="size-4" /> Start trading
              </Link>
            </div>
            <div className="hidden max-w-xl pt-1 md:block [&_input]:bg-white [&_input]:text-[#0b0b0c]">
              <ShopSearch variant="hero" placeholder="Search laptops, GPUs, phones, drones…" />
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/brand/siftah-solutions-logo.svg"
              alt="Siftah Solutions – trading as looterscomputas.online"
              decoding="async"
              className="h-auto w-full max-w-[320px] -rotate-3 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)] sm:max-w-[420px]"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Siftah apps">
        <a
          href="/plates/index.html"
          className="siftah-tile col-span-2 flex items-center gap-4 rounded-3xl border-2 border-[#0b0b0c] bg-[#e3121b] p-4 text-white shadow-[5px_5px_0_#0b0b0c] sm:col-span-3 lg:col-span-2 lg:row-span-2 lg:flex-col lg:items-start lg:justify-between lg:p-5"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#e3121b]">
            <CarFront className="size-8" />
          </span>
          <span>
            <span className="block font-display text-2xl leading-tight">Plate maker</span>
            <span className="block text-sm text-white/85">360×124 mm · 78 mm characters · print-ready PDF</span>
          </span>
        </a>
        <AppTile to="/arcade" icon={Gamepad2} label="Arcade" hint="Free games" tone="blue" />
        <AppTile href="/siftah/" icon={Sparkles} label="Mr CluedUp" hint="AI chat & create" tone="red" />
        <AppTile to="/shop" icon={ShoppingBag} label="Shop" hint="Browse gear" />
        <AppTile to="/sell" icon={Store} label="Sell" hint="List gear" />
        <AppTile to="/siftah-message" icon={MessageSquare} label="Message" hint="Member chat" />
        <AppTile to="/forum" icon={MessagesSquare} label="Forum" hint="Community" />
        <AppTile to="/account" icon={Wallet} label="Wallet" hint="PayPal & credits" />
        <AppTile to="/prints" icon={Printer} label="Prints" hint="Print studio" />
      </section>

      <div className="mt-8">
        <BrandTicker />
      </div>

      <SiftahMatrixAd />

      <section className="mt-10" aria-label="Marketplace categories">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Browse categories
            </h2>
            <p className="text-sm text-muted-foreground">
              Computers · gaming · gadgets · mobility · collectables
            </p>
          </div>
          <Link to="/sell" className="text-sm font-medium text-[#e3121b] hover:underline">
            List yours
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-5">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <Link
              key={label}
              to="/sell"
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center transition hover:border-[#e3121b]/40 hover:bg-secondary/60"
              title={`${label} — list yours now`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-[#e3121b] transition group-hover:bg-[#e3121b]/15">
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
                  background: "linear-gradient(180deg, #ff2a33 0%, #e3121b 45%, #e85d04 100%)",
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
            <Link to="/sell" className="rounded-full bg-[#e3121b] px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-[#ff2a33]">List an item</Link>
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
          <p className="text-sm font-medium text-[#e3121b]">Computers, laptops, gaming, components, phones, drones, e-bikes and more — direct PayPal between looters.</p>
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
          <p className="text-sm font-medium text-[#e3121b]">Physical shop closed — the brand moves online as a trading platform.</p>
          <img src={ARTWORK.storefront} alt="The old Looters Computas storefront" width={1600} height={720} decoding="async" className="w-full rounded-xl border border-border object-cover" />
          <div className="max-w-3xl space-y-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>The orange front, the penguin on the footpath, PCs in the glass — that's the old days. Doors are shut. What continues is the name, the people, and a place for looters to buy, sell and swap tech and gadgets with each other.</p>
            <p className="font-medium text-foreground">— Looters</p>
          </div>
        </NewsCard>
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 pb-8 pt-4">
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/login" className="rounded-xl bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-[#ff2a33]">Not yet a member? Sign Up</Link>
          <Link to="/sell" className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary">List something</Link>
        </div>
        <SiftahLogo className="h-28 w-auto max-w-[360px] sm:h-36 sm:max-w-[480px]" />
        <Link to="/siftah" className="inline-flex items-center justify-center rounded-xl p-2 transition hover:scale-[1.03]" aria-label="Open Siftah Mobile">
          <img src="/siftah-mobile-logo.svg" alt="Siftah Mobile" className="h-28 w-auto max-w-[180px] object-contain" loading="lazy" />
        </Link>
      </div>
    </AppShell>
  );
}

function TrustCard({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e3121b]/15 text-[#e3121b]">
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
      <div className="h-px w-full bg-[#e3121b]" />
    </div>
  );
}

function NewsCard({ date, dateTime, children }: { date: string; dateTime: string; children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:px-6">
        <span className="rounded bg-[#e3121b] px-1.5 py-0.5 text-[10px] font-bold text-[#ffffff]">Site news</span>
        <span aria-hidden="true">·</span>
        <time dateTime={dateTime}>{date}</time>
        <span className="ml-auto normal-case tracking-normal">Looters</span>
      </header>
      <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </article>
  );
}


function AppTile({
  to,
  href,
  icon: Icon,
  label,
  hint,
  tone = "ink",
}: {
  to?: "/arcade" | "/shop" | "/sell" | "/siftah-message" | "/forum" | "/account" | "/prints";
  href?: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  tone?: "ink" | "red" | "blue";
}) {
  const toneCls =
    tone === "red" ? "bg-[#e3121b] text-white" : tone === "blue" ? "bg-[#5cc8f2] text-[#0b0b0c]" : "bg-[#0b0b0c] text-white";
  const inner = (
    <>
      <span className={`flex size-11 items-center justify-center rounded-xl ${toneCls}`}>
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base leading-tight text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </>
  );
  const cls = "siftah-tile flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm";
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <Link to={to ?? "/"} className={cls}>{inner}</Link>;
}
