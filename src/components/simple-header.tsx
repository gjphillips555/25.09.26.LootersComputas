import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, MessageSquare, MessagesSquare, Store, Wallet, Sparkles } from "lucide-react";
import { AccountButton } from "@/components/account-button";
import { BrandLogo } from "@/components/brand-logo";
import { ShopSearch } from "@/components/shop-search";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/siftah" as const, label: "Siftah", icon: Sparkles },
  { to: "/sell" as const, label: "Sell", icon: Store },
  { to: "/account" as const, label: "Inbox", icon: MessageSquare },
  { to: "/hidden/forum" as const, label: "Forum", icon: MessagesSquare },
  { to: "/account" as const, label: "Wallet", icon: Wallet },
] as const;

export function SimpleHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <Link to="/" className="flex min-w-0 shrink items-center" aria-label="Looters Computas home">
          <BrandLogo className="h-10 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-[220px]" />
        </Link>
        <ShopSearch className="hidden min-w-0 flex-1 md:flex md:max-w-md" showButton={false} placeholder="Search computers, gaming, phones…" />
        <nav className="ml-auto hidden shrink-0 items-center gap-1 lg:flex" aria-label="Marketplace">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={label} to={to} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground">
              <Icon className="size-4" strokeWidth={1.85} /><span>{label}</span>
            </Link>
          ))}
          <ThemeToggle />
          <AccountButton />
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex lg:hidden">
          <ThemeToggle /><AccountButton />
        </div>
        <button type="button" className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary lg:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-border bg-background px-3 py-3 shadow-xl lg:hidden">
          <nav className="grid grid-cols-2 gap-2" aria-label="Mobile marketplace">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={label} to={to} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
                <Icon className="size-4 text-[#ff9a00]" />{label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Sign in / Join</Link>
          </nav>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-sm text-muted-foreground">Display</span><ThemeToggle />
          </div>
          <div className="mt-3"><AccountButton /></div>
        </div>
      )}
    </header>
  );
}
