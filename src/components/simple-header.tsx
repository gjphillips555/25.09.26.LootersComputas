import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  MessagesSquare,
  Store,
  Wallet,
} from "lucide-react";
import { AccountButton } from "@/components/account-button";
import { BrandLogo } from "@/components/brand-logo";
import { ShopSearch } from "@/components/shop-search";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/sell" as const, label: "Sell", icon: Store },
  { to: "/account" as const, label: "Inbox", icon: MessageSquare },
  { to: "/hidden/forum" as const, label: "Forum", icon: MessagesSquare },
  { to: "/account" as const, label: "Wallet", icon: Wallet },
] as const;

export function SimpleHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Looters Computas home"
          >
            <BrandLogo className="h-10 w-auto max-w-[160px] object-contain sm:h-12 sm:max-w-[220px]" />
          </Link>

          {/* Desktop search in the top row */}
          <ShopSearch
            className="hidden min-w-0 flex-1 md:flex md:max-w-md"
            showButton={false}
            placeholder="Search computers, gaming, phones…"
          />

          <nav
            className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5"
            aria-label="Marketplace"
          >
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground sm:px-2.5 sm:text-sm"
              >
                <Icon className="size-3.5 sm:size-4" strokeWidth={1.85} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <ThemeToggle />
            <AccountButton />
          </nav>
        </div>

        {/* Mobile search row */}
        <div className="md:hidden">
          <ShopSearch
            className="w-full"
            showButton={false}
            placeholder="Search marketplace…"
            variant="plain"
          />
        </div>
      </div>
    </header>
  );
}
