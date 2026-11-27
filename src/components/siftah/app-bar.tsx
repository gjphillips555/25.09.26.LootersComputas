import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Grid3x3, Search, Wallet, X } from "lucide-react";
import { ShopSearch } from "@/components/shop-search";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ARTWORK } from "@/lib/artwork";
import { cn } from "@/lib/utils";
import { AccountPanel } from "./account-panel";
import { SiftahLogo } from "./brand";
import { APPS, LEGAL, PLATES, TOP_LINKS, isActive, type NavItem } from "./nav";
import { NavLink } from "./nav-link";
import { UserAvatar } from "./user-avatar";

const TILE_TONE: Record<NonNullable<NavItem["tone"]>, string> = {
  red: "bg-[#e3121b] text-white",
  blue: "bg-[#5cc8f2] text-[#0b0b0c]",
  ink: "bg-white/10 text-white",
  white: "bg-white text-[#0b0b0c]",
};

/** Pick the logo that matches the current section of the site. */
function HeaderLogo({ pathname }: { pathname: string }) {
  const lootersClass =
    "h-11 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-[190px]";

  // Marketplace / shop / sell / account / forum / build → Looters Computas
  if (
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/sell") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/forum") ||
    pathname.startsWith("/build") ||
    pathname.startsWith("/prints") ||
    pathname.startsWith("/overlay") ||
    pathname.startsWith("/settings")
  ) {
    return (
      <img
        src={ARTWORK.logoOrange}
        alt="Looters Computas"
        decoding="async"
        className={lootersClass}
      />
    );
  }

  // Siftah Auto
  if (pathname.startsWith("/auto")) {
    return (
      <img
        src={ARTWORK.logoOrange}
        alt="Siftah Auto · Looters Computas"
        decoding="async"
        className={lootersClass}
      />
    );
  }

  // Siftah AI / Plate maker / Arcade → Siftah Solutions sticker
  if (
    pathname.startsWith("/siftah") ||
    pathname.startsWith("/plates") ||
    pathname.startsWith("/arcade") ||
    pathname.startsWith("/pindrop")
  ) {
    return (
      <SiftahLogo className="h-12 max-w-[150px] sm:h-[3.25rem] sm:max-w-[190px]" />
    );
  }

  // Default brand
  return (
    <SiftahLogo className="h-12 max-w-[150px] sm:h-[3.25rem] sm:max-w-[190px]" />
  );
}

/** App-style top bar (black, section logo) + slide-out app drawer. */
export function SiftahAppBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const { user, isPending } = useCurrentUserState();
  const { pathname, searchStr } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const open = () => setMenuOpen(true);
    const close = () => setMenuOpen(false);
    window.addEventListener("siftah:open-menu", open);
    window.addEventListener("siftah:close-menu", close);
    return () => {
      window.removeEventListener("siftah:open-menu", open);
      window.removeEventListener("siftah:close-menu", close);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Load Siftah Credits balance when signed in
  useEffect(() => {
    if (!user) {
      setCredits(null);
      return;
    }
    let active = true;
    fetch("/api/siftah/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "status failed");
        return data;
      })
      .then((data) => {
        if (active) setCredits(Number(data.usage?.creditsBalance ?? 0));
      })
      .catch(() => {
        if (active) setCredits(0);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0b0b0c] text-white shadow-[0_6px_24px_-12px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Home">
            <HeaderLogo pathname={pathname} />
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {TOP_LINKS.map((item) => {
              const active = isActive(pathname, item.href);
              const featured = item === PLATES;
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-bold transition xl:px-3 xl:text-sm",
                    featured
                      ? "bg-[#e3121b] text-white hover:bg-[#ff2a33]"
                      : active
                        ? "bg-white text-[#0b0b0c]"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={2.2} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Credits balance – visible when signed in */}
            {user && (
              <Link
                to="/account"
                className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold tabular-nums text-white transition hover:bg-white/10 sm:inline-flex"
                title="Siftah Credits · Account & wallet"
              >
                <Wallet className="size-3.5 text-[#5cc8f2]" />
                <span>{credits === null ? "…" : credits}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex size-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              aria-label={searchOpen ? "Close search" : "Search marketplace"}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="hidden size-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              aria-label="Open app menu"
            >
              <Grid3x3 className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="relative inline-flex size-10 items-center justify-center rounded-full ring-2 ring-white/15 transition hover:ring-[#e3121b]"
              aria-label={user ? "Account and app menu" : "Sign in and app menu"}
            >
              {isPending ? (
                <span className="size-10 animate-pulse rounded-full bg-white/10" />
              ) : (
                <UserAvatar user={user} className="size-10" />
              )}
              {!isPending && !user && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#0b0b0c] bg-[#e3121b] px-1.5 text-[8px] font-black uppercase leading-[14px] tracking-wide text-white">
                  Sign in
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="siftah-stripe h-1 w-full" />
        {searchOpen && (
          <div className="siftah-fade border-t border-white/10 bg-[#0b0b0c] px-3 py-3 sm:px-6">
            <ShopSearch className="mx-auto max-w-2xl" autoFocus placeholder="Search computers, gaming, phones…" />
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="App menu">
          <button
            type="button"
            className="siftah-fade absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="siftah-drawer absolute inset-y-0 right-0 flex w-[min(25rem,92vw)] flex-col overflow-y-auto bg-[#0b0b0c] text-white shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-4">
              <SiftahLogo className="h-12 max-w-[170px]" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="siftah-stripe mx-4 mt-3 h-1 rounded-full" />

            <div className="space-y-5 p-4 siftah-safe-bottom">
              <AccountPanel onNavigate={() => setMenuOpen(false)} callbackURL={pathname + (searchStr || "")} />

              {/* Inline balance when signed in */}
              {user && (
                <Link
                  to="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Wallet className="size-4 text-[#5cc8f2]" />
                    Siftah Credits
                  </span>
                  <span className="text-lg font-black tabular-nums">
                    {credits === null ? "…" : credits}
                  </span>
                </Link>
              )}

              <NavLink
                item={PLATES}
                onClick={() => setMenuOpen(false)}
                className="siftah-tile flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-[#e3121b] bg-gradient-to-br from-[#e3121b] to-[#a80b12] p-4 text-white"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#e3121b] shadow-lg">
                  <PLATES.icon className="size-8" strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-xl leading-tight">Siftah Plate Maker</span>
                  <span className="block text-xs text-white/85">True-size 360×124 mm · 78 mm characters · print-ready PDF</span>
                </span>
              </NavLink>

              <div>
                <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Apps</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {APPS.filter((a) => a !== PLATES).map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "siftah-tile flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3 text-center",
                          active && "border-[#e3121b] bg-[#e3121b]/10",
                        )}
                      >
                        <span className={cn("flex size-11 items-center justify-center rounded-xl", TILE_TONE[item.tone ?? "ink"])}>
                          <item.icon className="size-5" strokeWidth={2.2} />
                        </span>
                        <span className="text-xs font-bold leading-tight">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 px-1 pt-4 text-xs text-white/55">
                {LEGAL.map((item) => (
                  <NavLink key={item.href} item={item} onClick={() => setMenuOpen(false)} className="hover:text-white">
                    {item.label}
                  </NavLink>
                ))}
                <span>Siftah Solutions · trading as looterscomputas.online</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
